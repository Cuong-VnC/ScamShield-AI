"""DNS resolution and direct, bounded connections for untrusted destinations."""

import http.client
import ipaddress
import re
import socket
import ssl
from contextlib import contextmanager
from threading import Timer
from time import monotonic
from urllib.parse import quote, urlsplit

import dns.exception
import dns.resolver


WEB_PORTS = {80, 443, 8000, 8080, 8443}
_IPV6_GLOBAL = ipaddress.ip_network("2000::/3")
_NON_PUBLIC_NETWORKS = tuple(map(ipaddress.ip_network, (
    "192.0.0.0/24", "192.88.99.0/24", "2001::/23", "2002::/16", "3fff::/20",
)))


class UnsafeTarget(ValueError):
    pass


def ip_literal(host):
    try:
        return ipaddress.ip_address(host)
    except (TypeError, ValueError):
        return None


def is_public_ip(address):
    ip = ip_literal(address)
    return (ip is not None and ip.is_global and not ip.is_multicast and not ip.is_reserved
            and not getattr(ip, "scope_id", None)
            and (ip.version == 4 or ip in _IPV6_GLOBAL)
            and not any(ip in network for network in _NON_PUBLIC_NETWORKS))


def public_addresses(host, records):
    literal = ip_literal(host)
    if literal is not None:
        addresses = (str(literal),)
    else:
        name = host.lower().rstrip(".")
        if (not name or len(name) > 253 or "." not in name
                or name.rsplit(".", 1)[-1] in {"localhost", "local", "internal", "onion", "invalid"}
                or name.endswith(".home.arpa")
                or not all(re.fullmatch(r"[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?", part)
                           for part in name.split("."))):
            raise UnsafeTarget("non-public hostname")
        addresses = tuple(dict.fromkeys([*records.get("a", ()), *records.get("aaaa", ())]))
    if any(not is_public_ip(address) for address in addresses):
        raise UnsafeTarget("non-public address")
    return addresses


def remaining(deadline):
    seconds = deadline - monotonic()
    if seconds <= 0:
        raise TimeoutError
    return seconds


def resolve_addresses(host, deadline, resolver=None):
    records = {"a": [], "aaaa": []}
    if ip_literal(host) is not None:
        return "skipped_ip", records
    try:
        public_addresses(host, records)  # Reject local names before DNS.
        if resolver is None:
            resolver = dns.resolver.Resolver()
    except UnsafeTarget:
        return "blocked", records
    except (dns.exception.DNSException, OSError):
        return "error", records

    failures = set()
    for kind in ("a", "aaaa"):
        try:
            answers = resolver.resolve(host, kind.upper(), search=False,
                                       lifetime=min(1.5, remaining(deadline)))
            records[kind] = [answer.to_text() for answer in answers]
        except dns.resolver.NXDOMAIN:
            if not records["a"]:
                return "nxdomain", records
        except dns.resolver.NoAnswer:
            pass
        except (dns.exception.Timeout, TimeoutError):
            failures.add("timeout")
        except (dns.exception.DNSException, OSError):
            failures.add("error")
    if records["a"] or records["aaaa"]:
        return "resolved", records
    return ("timeout" if "timeout" in failures else "error" if failures else "no_answer"), records


def connect_public(addresses, port, deadline, *, server_name=None):
    """Open a socket by numeric address. Hostname is used only for TLS identity."""
    if not addresses or any(not is_public_ip(address) for address in addresses):
        raise UnsafeTarget("no validated public destination")
    tls = ssl.create_default_context() if server_name else None
    last_error = None
    # Validate the entire answer above, then bound dial attempts for each family.
    ipv4 = [address for address in addresses if ":" not in address][:2]
    ipv6 = [address for address in addresses if ":" in address][:2]
    for address in (*ipv4, *ipv6):
        timeout = remaining(deadline)
        ip = ipaddress.ip_address(address)
        ipv6 = ip.version == 6
        sock = socket.socket(socket.AF_INET6 if ipv6 else socket.AF_INET, socket.SOCK_STREAM)
        try:
            # Leave time for other addresses and the response if one IP is slow.
            sock.settimeout(min(timeout, 1.5))
            sock.connect((str(ip), port, 0, 0) if ipv6 else (str(ip), port))
            if tls is not None:
                sock.settimeout(remaining(deadline))
                sock = tls.wrap_socket(sock, server_hostname=server_name.rstrip("."))
            return sock, str(ip)
        except ssl.SSLCertVerificationError:
            sock.close()
            raise
        except (OSError, ValueError) as exc:
            sock.close()
            last_error = exc
    raise last_error


def parse_web_target(url):
    if len(url) > 8192 or re.search(r"[\x00-\x20\x7f\\]", url):
        raise UnsafeTarget("invalid HTTP target")
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").encode("idna").decode("ascii")
        if parsed.scheme not in {"http", "https"} or not host:
            raise UnsafeTarget("invalid HTTP target")
        port = parsed.port if parsed.port is not None else (443 if parsed.scheme == "https" else 80)
    except ValueError as exc:
        raise UnsafeTarget("invalid HTTP target") from exc
    if port not in WEB_PORTS:
        raise UnsafeTarget("web port blocked")
    return parsed, host, port


def _interrupt(sock):
    try:
        sock.shutdown(socket.SHUT_RDWR)
    except OSError:
        pass


@contextmanager
def open_web_response(parsed, host, port, addresses, headers, deadline):
    """Issue one GET with no redirects, proxies, cookies, or URL credentials."""
    safe = "/%:@!$&'()*+,;=-._~"
    path = quote(parsed.path or "/", safe=safe)
    if parsed.query:
        path += "?" + quote(parsed.query, safe=safe + "?[]")
    authority = f"[{host}]" if ":" in host else host
    default_port = 443 if parsed.scheme == "https" else 80
    if port != default_port:
        authority += f":{port}"

    sock, ip = connect_public(addresses, port, deadline,
                              server_name=host if parsed.scheme == "https" else None)
    conn = http.client.HTTPConnection(host, port)
    conn.auto_open = 0  # Never fall back to HTTPConnection.connect() by hostname.
    conn.sock = sock
    try:
        timeout = remaining(deadline)
        sock.settimeout(timeout)
        # A per-read timeout alone allows a server to drip-feed headers indefinitely.
        timer = Timer(timeout, _interrupt, args=(sock,))
        timer.daemon = True
        timer.start()
        try:
            conn.request("GET", path, headers={**headers, "Host": authority, "Connection": "close"})
            with conn.getresponse() as response:
                yield response, ip
        finally:
            timer.cancel()
    finally:
        conn.close()
        sock.close()
