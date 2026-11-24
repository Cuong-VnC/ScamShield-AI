"""Tra cứu thông tin tên miền cho ScamShield (DNS / WHOIS / TLS / HTTP).

Mọi hàm đều fail-soft: timeout ngắn (3-5 giây), tra cứu nào lỗi thì trả
"unknown" cho mục đó, KHÔNG bao giờ raise lên tầng gọi. Module này không
chạm vào model hay thứ tự đặc trưng — chỉ bổ sung thông tin hiển thị và
logic "tên miền không tồn tại / không hoạt động" cho /predict.
"""
import http.client
import re
import ssl
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import BoundedSemaphore
from time import monotonic
from urllib.parse import urljoin, urlparse

import dns.exception
import dns.resolver
import dns.reversename
import requests
import tldextract
import whois

from network_safety import (
    UnsafeTarget, WEB_PORTS, connect_public, ip_literal, is_public_ip,
    open_web_response, parse_web_target, public_addresses, remaining, resolve_addresses,
)


DNS_TIMEOUT = 4.0
WHOIS_TIMEOUT = 4.0
TLS_TIMEOUT = 4.0
HTTP_TIMEOUT = 4.0
IP_API_TIMEOUT = 4.0
IP_API_URL = ("http://ip-api.com/json/{ip}"
              "?fields=status,country,regionName,city,isp,org,as,query")
MAX_REDIRECTS = 5
OVERALL_TIMEOUT = 6.0
_UA = {"User-Agent": "Mozilla/5.0 (ScamShield-AI domain check)"}
# Use the bundled PSL for display checks to avoid a network request during cold start.
extract_domain_parts = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None)
_PROBE_WORKERS = 8
_probe_pool = ThreadPoolExecutor(max_workers=_PROBE_WORKERS, thread_name_prefix="domain-probe")
_probe_slots = BoundedSemaphore(_PROBE_WORKERS)


def _submit_probe(fn, *args):
    if not _probe_slots.acquire(blocking=False):
        return None
    try:
        future = _probe_pool.submit(fn, *args)
    except BaseException:
        _probe_slots.release()
        raise
    future.add_done_callback(lambda _: _probe_slots.release())
    return future


def _fmt_date(value):
    """Chuẩn hóa ngày WHOIS (datetime / chuỗi / list) về 'YYYY-MM-DD' hoặc None."""
    if value is None:
        return None
    if isinstance(value, list):
        value = next((v for v in value if v), None)
        if value is None:
            return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str):
        m = re.search(r"(\d{4}-\d{2}-\d{2})", value)
        return m.group(1) if m else None
    return None


def _parse_date(value):
    """Như _fmt_date nhưng trả datetime (aware UTC) để tính tuổi domain."""
    if value is None:
        return None
    if isinstance(value, list):
        value = next((v for v in value if v), None)
        if value is None:
            return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        m = re.search(r"(\d{4}-\d{2}-\d{2})", value)
        if m:
            return datetime.fromisoformat(m.group(1)).replace(tzinfo=timezone.utc)
    return None


def _registered_domain(host):
    """Tên miền đăng ký (vd www.google.com -> google.com), dùng cho SOA/DMARC/DNSSEC."""
    ext = extract_domain_parts(host or "")
    return f"{ext.domain}.{ext.suffix}" if ext.domain and ext.suffix else (host or "")


def _parse_soa(text):
    """SOA rdata: 'mname rname serial refresh retry expire minimum' -> dict."""
    parts = (text or "").split()
    if not parts:
        return None
    return {"primary_ns": parts[0].rstrip("."),
            "serial": parts[2] if len(parts) > 2 else None,
            "raw": text}


def _parse_dmarc(text):
    """Bản ghi DMARC (v=DMARC1; p=...) -> {'record': ..., 'policy': ...}."""
    if not text:
        return None
    m = re.search(r"\bp\s*=\s*(none|quarantine|reject)\b", text, re.IGNORECASE)
    return {"record": text[:300], "policy": m.group(1).lower() if m else None}


_SIG_ALG_OIDS = {
    "1.2.840.113549.1.1.4": "md5WithRSAEncryption",
    "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
    "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
    "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
    "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
    "1.2.840.113549.1.1.14": "sha224WithRSAEncryption",
    "1.2.840.10045.4.3.1": "ecdsa-with-SHA224",
    "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
    "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
    "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
    "1.2.840.10045.4.1": "ecdsa-with-SHA1",
    "1.3.101.112": "Ed25519",
    "1.3.101.113": "Ed448",
}


def _read_tlv(buf, pos):
    """Đọc 1 thẻ DER tại pos -> (tag, vị trí bắt đầu nội dung, độ dài nội dung)."""
    tag = buf[pos]
    pos += 1
    if tag & 0x1F == 0x1F:  # tag nhiều byte (không gặp ở đây, vẫn xử lý cho đủ)
        while buf[pos] & 0x80:
            pos += 1
        pos += 1
    ln = buf[pos]
    pos += 1
    if ln & 0x80:
        n = ln & 0x7F
        ln = int.from_bytes(buf[pos:pos + n], "big")
        pos += n
    return tag, pos, ln


def _sig_alg_from_der(der):
    """Thuật toán ký từ chứng chỉ DER (không cần thư viện ngoài).

    Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
    -> bỏ qua tbsCertificate, đọc OID đầu tiên trong signatureAlgorithm.
    """
    try:
        _, p, _ = _read_tlv(der, 0)          # SEQUENCE ngoài
        _, p2, l2 = _read_tlv(der, p)        # tbsCertificate
        p = p2 + l2                          # bỏ qua tbsCertificate
        _, p3, _ = _read_tlv(der, p)         # signatureAlgorithm SEQUENCE
        _, p4, l4 = _read_tlv(der, p3)       # OID
        raw = der[p4:p4 + l4]
        if not raw:
            return None
        parts = [raw[0] // 40, raw[0] % 40]
        val = 0
        for b in raw[1:]:
            val = (val << 7) | (b & 0x7F)
            if not (b & 0x80):
                parts.append(val)
                val = 0
        oid = ".".join(str(x) for x in parts)
        return _SIG_ALG_OIDS.get(oid, f"OID {oid}")
    except Exception:
        return None


def _cert_sig_alg(der):
    """Thuật toán ký của chứng chỉ DER: thử `cryptography` trước, không có thì
    dùng bộ giải DER tối giản ở trên (stdlib thuần). Luôn fail-soft."""
    if not der:
        return None
    try:
        from cryptography import x509
        cert = x509.load_der_x509_certificate(der)
        return cert.signature_algorithm_oid._name
    except ImportError:
        return _sig_alg_from_der(der)
    except Exception:
        return None


def _ip_geo(ip):
    """Geo/ASN/ISP của 1 IP qua ip-api.com (miễn phí, không cần key).
    Trả dict {'country','region','city','isp','org','asn'} hoặc None (fail-soft)."""
    if not is_public_ip(ip):
        return None
    try:
        with requests.get(IP_API_URL.format(ip=ip), headers=_UA, timeout=IP_API_TIMEOUT,
                          allow_redirects=False) as response:
            data = response.json()
        if data.get("status") == "success":
            return {"country": data.get("country"), "region": data.get("regionName"),
                    "city": data.get("city"), "isp": data.get("isp"),
                    "org": data.get("org"), "asn": data.get("as")}
    except Exception:
        pass
    return None


def _query(resolver, host, rtype, deadline):
    """Tra cứu bổ sung phục vụ hiển thị, trong deadline DNS chung."""
    try:
        answers = resolver.resolve(host, rtype, search=False,
                                   lifetime=min(1.0, remaining(deadline)))
        return [text for answer in answers if (text := answer.to_text().strip().strip('"'))]
    except (OSError, dns.exception.DNSException):
        return []


def resolve_dns(host, resolver=None):
    """Trả trạng thái, bản ghi A/AAAA và các bản ghi hiển thị trong một deadline."""
    records = {"a": [], "aaaa": [], "mx": [], "ns": [], "txt": [], "cname": [],
               "soa": None, "ptr": [], "spf": None, "dmarc": None,
               "dnssec": {"enabled": False, "ds": False, "dnskey": False}}
    deadline = monotonic() + DNS_TIMEOUT
    try:
        if resolver is None and ip_literal(host) is None:
            public_addresses(host, records)
            resolver = dns.resolver.Resolver()
        status, addresses = resolve_addresses(host, deadline, resolver)
    except UnsafeTarget:
        return "blocked", records
    except (dns.exception.DNSException, OSError):
        return "error", records
    records.update(addresses)
    if status != "resolved":
        return status, records
    try:
        public_addresses(host, records)
    except UnsafeTarget:
        records["a"] = records["aaaa"] = []
        return "blocked", records
    try:
        records["mx"] = _query(resolver, host, "MX", deadline)[:5]
        records["ns"] = _query(resolver, host, "NS", deadline)[:5]
        txt_full = _query(resolver, host, "TXT", deadline)[:5]
        records["txt"] = [text[:200] for text in txt_full[:3]]
        records["spf"] = next(
            (text for text in txt_full if text.lower().startswith("v=spf1")), None)
        reg = _registered_domain(host)
        records["cname"] = _query(resolver, host, "CNAME", deadline)[:3]
        soa_raw = _query(resolver, reg, "SOA", deadline)
        records["soa"] = _parse_soa(soa_raw[0]) if soa_raw else None
        first_ip = (records["a"] or records["aaaa"])[0]
        rev = dns.reversename.from_address(first_ip)
        records["ptr"] = [text.rstrip(".") for text in _query(resolver, rev, "PTR", deadline)[:2]]
        dmarc_raw = _query(resolver, "_dmarc." + reg, "TXT", deadline)
        records["dmarc"] = _parse_dmarc(dmarc_raw[0]) if dmarc_raw else None
        ds = _query(resolver, reg, "DS", deadline)
        dnskey = _query(resolver, reg, "DNSKEY", deadline)
        records["dnssec"] = {"enabled": bool(ds or dnskey), "ds": bool(ds), "dnskey": bool(dnskey)}
    except (ValueError, OSError, dns.exception.DNSException):
        pass
    return status, records


def _resolved_public_addresses(host, deadline):
    status, records = resolve_addresses(host, deadline)
    if status == "blocked":
        raise UnsafeTarget("non-public hostname")
    addresses = public_addresses(host, records)
    if not addresses:
        if status == "timeout":
            raise TimeoutError
        raise OSError("DNS lookup unavailable")
    return addresses


def _read_whois(host, query, deadline):
    addresses = _resolved_public_addresses(host, deadline)
    sock, _ = connect_public(addresses, 43, deadline)
    with sock:
        sock.settimeout(remaining(deadline))
        sock.sendall(query.encode("ascii") + b"\r\n")
        data = bytearray()
        limit = 64 * 1024
        while len(data) < limit:
            sock.settimeout(remaining(deadline))
            chunk = sock.recv(min(4096, limit - len(data)))
            if not chunk:
                break
            data.extend(chunk)
    return data.decode("utf-8", "replace")


def _lookup_whois(domain):
    """Reuse WHOIS registry selection and parsing with bounded public sockets."""
    query = domain.rstrip(".").encode("idna").decode("ascii")
    public_addresses(query, {})
    client = whois.NICClient()
    host = client.choose_server(query)
    if not host:
        return None
    deadline = monotonic() + WHOIS_TIMEOUT
    wire_query = query
    if host == client.DENICHOST:
        wire_query = "-T dn,ace -C UTF-8 " + query
    elif host == client.DK_HOST:
        wire_query = " --show-handles " + query
    response = _read_whois(host, wire_query, deadline)
    try:
        if 'with "=xxx"' in response and host.endswith(client.QNICHOST_TAIL):
            response = _read_whois(host, "=" + query, deadline)
        referral = client.findwhois_server(response, host, query)
        if referral and referral != host:
            response += _read_whois(referral, query, deadline)
    except (UnsafeTarget, OSError):
        pass  # An unavailable referral does not discard the registry response.
    return whois.WhoisEntry.load(domain, response)


def whois_lookup(domain):
    """WHOIS: ngày tạo / cập nhật / hết hạn / registrar / tuổi domain (ngày) /
    nameservers / trạng thái WHOIS."""
    out = {"status": "unknown", "created": None, "expires": None, "updated": None,
           "registrar": None, "age_days": None, "name_servers": None,
           "domain_status": None}
    if not domain or "." not in domain or ip_literal(domain) is not None:
        return out
    try:
        w = _lookup_whois(domain)
        created = _parse_date(getattr(w, "creation_date", None))
        expires = _parse_date(getattr(w, "expiration_date", None))
        registrar = getattr(w, "registrar", None)
        if isinstance(registrar, list):
            registrar = next((r for r in registrar if r), None)
        out["created"] = _fmt_date(getattr(w, "creation_date", None))
        out["expires"] = _fmt_date(getattr(w, "expiration_date", None))
        out["updated"] = _fmt_date(getattr(w, "updated_date", None))
        out["registrar"] = str(registrar)[:120] if registrar else None
        ns = getattr(w, "name_servers", None)
        if isinstance(ns, str):
            ns = [ns]
        if ns:
            seen = []
            for x in ns:
                s = str(x).strip().lower().rstrip(".")
                if s and s not in seen:
                    seen.append(s)
            out["name_servers"] = seen[:5] or None
        st = getattr(w, "status", None)
        if isinstance(st, str):
            st = [st]
        if st:
            out["domain_status"] = [str(x).strip()[:80] for x in st if x][:5] or None
        if created:
            out["age_days"] = max(0, (datetime.now(timezone.utc) - created).days)
            out["status"] = "ok"
        elif out["registrar"] or out["expires"]:
            out["status"] = "ok"
    except Exception:
        pass
    return out


def _tls_defaults(error=None):
    return {"checked": False, "valid": None, "issuer": None, "subject": None,
            "expires": None, "days_left": None, "error": error, "sans": None,
            "sig_alg": None, "tls_version": None, "cipher": None, "cipher_bits": None}


def tls_info(host, port=443, addresses=None):
    """Đọc chứng chỉ qua IP đã kiểm tra, với SNI và xác thực theo hostname."""
    out = _tls_defaults()
    if not host or ip_literal(host) is not None:
        return _tls_defaults("IP host, skip TLS check")
    if port not in WEB_PORTS:
        return _tls_defaults("web port blocked")
    try:
        deadline = monotonic() + TLS_TIMEOUT
        if addresses is None:
            addresses = _resolved_public_addresses(host, deadline)
        sock, _ = connect_public(addresses, port, deadline, server_name=host)
        with sock:
            cert = sock.getpeercert()
            der = sock.getpeercert(binary_form=True)
            out["tls_version"] = sock.version()
            cipher = sock.cipher()
            if cipher:
                out["cipher"], _, out["cipher_bits"] = cipher
        out["checked"] = True

        def _name(field):
            parts = {key: value for item in cert.get(field, []) for key, value in item}
            return parts.get("organizationName") or parts.get("commonName")

        out["issuer"] = _name("issuer")
        out["subject"] = _name("subject")
        sans = [value for kind, value in cert.get("subjectAltName", []) if kind == "DNS"]
        out["sans"] = sans[:10] or None
        out["sig_alg"] = _cert_sig_alg(der)
        exp = cert.get("notAfter")
        if exp:
            dt = datetime.fromtimestamp(ssl.cert_time_to_seconds(exp), timezone.utc)
            out["expires"] = dt.date().isoformat()
            out["days_left"] = (dt - datetime.now(timezone.utc)).days
        out["valid"] = True  # The TLS context verified the hostname and certificate lifetime.
    except ssl.SSLCertVerificationError:
        out.update(checked=True, valid=False, error="certificate verification failed")
    except UnsafeTarget:
        out["error"] = "destination blocked"
    except TimeoutError:
        out["error"] = "timeout"
    except (OSError, ValueError):
        out["error"] = "TLS connection failed"
    return out


def _http_defaults(error=None):
    return {"reachable": None, "status_code": None, "final_url": None, "redirects": [],
            "server": None, "content_type": None, "content_length": None, "redirect_count": 0,
            "resolved_ip": None, "ip_info": None, "response_time_ms": None, "error": error}


def http_check(url, addresses=None):
    """Kiểm tra HTTP theo từng hop, giới hạn thời gian và chỉ đọc header."""
    out = _http_defaults()
    start = monotonic()
    deadline = start + HTTP_TIMEOUT
    current = url
    try:
        for hop in range(MAX_REDIRECTS + 1):
            parsed, host, port = parse_web_target(current)
            if addresses is None:
                addresses = _resolved_public_addresses(host, deadline)
            if hop:
                out["redirects"].append(current)
            with open_web_response(parsed, host, port, addresses, _UA, deadline) as (response, ip):
                out["status_code"] = response.status
                out["final_url"] = current
                out["resolved_ip"] = ip
                out["server"] = (response.headers.get("Server") or "")[:120] or None
                out["content_type"] = (response.headers.get("Content-Type") or "").split(";")[0][:80] or None
                try:
                    length = response.headers.get("Content-Length")
                    out["content_length"] = int(length) if length is not None else None
                except ValueError:
                    out["content_length"] = None
                location = response.headers.get("Location")
            if response.status not in (301, 302, 303, 307, 308) or not location:
                out["reachable"] = response.status < 500
                return out
            current = urljoin(current, location)
            addresses = None  # Resolve and pin the next hop, including same-host redirects.
        out["error"] = "too many redirects"
    except UnsafeTarget:
        out["error"] = "destination blocked"
    except ssl.SSLError:
        out["error"] = "TLS connection failed"
    except TimeoutError:
        out["error"] = "timeout"
    except (OSError, ValueError, http.client.HTTPException):
        out["error"] = "timeout" if monotonic() >= deadline else "HTTP connection failed"
    finally:
        out["redirect_count"] = len(out["redirects"])
        out["response_time_ms"] = int((monotonic() - start) * 1000)
    out["reachable"] = False
    return out


def _probe_result(future, default, deadline):
    if future is not None:
        try:
            return future.result(timeout=remaining(deadline))
        except Exception:
            future.cancel()
    return default


def get_domain_info(url, dns_result=None, resolver=None):
    """Tổng hợp thông tin tên miền với số tác vụ và deadline hữu hạn."""
    parsed = urlparse(str(url))
    host = (parsed.hostname or "").lower()
    domain = _registered_domain(host)
    is_ip = ip_literal(host) is not None
    dns_status, dns_records = dns_result if dns_result is not None else resolve_dns(host, resolver=resolver)
    try:
        addresses = public_addresses(host, dns_records) if dns_status != "blocked" else ()
    except UnsafeTarget:
        dns_status = "blocked"
        dns_records = {**dns_records, "a": [], "aaaa": []}
        addresses = ()

    deadline = monotonic() + OVERALL_TIMEOUT
    whois_task = _submit_probe(whois_lookup, domain) if not is_ip and dns_status != "blocked" else None
    tls_task = None
    http_task = None
    if addresses:
        if parsed.scheme == "https" and not is_ip:
            tls_task = _submit_probe(tls_info, host, parsed.port or 443, addresses)
        http_task = _submit_probe(http_check, str(url), addresses)

    whois_out = _probe_result(whois_task, {
        "status": "unknown", "created": None, "expires": None, "updated": None,
        "registrar": None, "age_days": None, "name_servers": None, "domain_status": None,
    }, deadline)
    tls_out = _probe_result(tls_task, _tls_defaults("timeout" if tls_task else None), deadline)
    http_out = _probe_result(http_task, _http_defaults("timeout" if http_task else None), deadline)

    resolved_ip = http_out["resolved_ip"] or (addresses[0] if addresses else None)
    http_out["resolved_ip"] = resolved_ip
    if resolved_ip and monotonic() < deadline:
        geo_task = _submit_probe(_ip_geo, resolved_ip)
        http_out["ip_info"] = _probe_result(geo_task, None, deadline)

    if dns_status == "nxdomain":
        status, reachable = "nonexistent", False
    elif dns_status in ("no_answer", "blocked"):
        status, reachable = ("inactive", False) if dns_status == "no_answer" else ("unknown", None)
    elif http_out["reachable"] is True:
        status, reachable = "active", True
    elif http_out["reachable"] is False and dns_status in ("resolved", "skipped_ip"):
        status, reachable = "inactive", False
    else:
        status, reachable = "unknown", None

    return {
        "domain": domain, "host": host, "is_ip_host": is_ip,
        "dns": {"status": dns_status, **dns_records},
        "whois": whois_out, "tls": tls_out, "http": http_out,
        "status": status, "reachable": reachable,
    }


def check_domain_existence(host, resolver=None):
    """Kiểm tra nhanh tên miền có tồn tại không (chỉ DNS A/AAAA).

    Trả về "nonexistent" | "exists" | "unknown". Dùng cho quyết định dừng
    sớm trong /predict: NXDOMAIN -> không chạy model.
    """
    if not host or re.fullmatch(r"\d+\.\d+\.\d+\.\d+", host) or ":" in host:
        return "exists"  # host IP: không áp dụng logic DNS
    status, _ = resolve_dns(host, resolver=resolver)
    if status == "nxdomain":
        return "nonexistent"
    if status in ("resolved", "no_answer"):
        return "exists"
    return "unknown"
