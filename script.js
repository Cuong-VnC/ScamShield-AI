'use strict';
const translations = {
  vi: {navScan:'Quét URL',navFeatures:'Tính năng',navReport:'Báo cáo rủi ro',login:'Đăng nhập',eyebrow:'HỆ THỐNG PHÁT HIỆN RỦI RO TRỰC TUYẾN',heroTitle:'An toàn hơn trong<br><span>thế giới số.</span>',heroDescription:'Phát hiện dấu hiệu lừa đảo từ đường liên kết, đánh giá mức độ rủi ro và đưa ra cảnh báo rõ ràng — trước khi bạn nhấp chuột.',startScan:'Bắt đầu kiểm tra',learnMore:'Khám phá nền tảng',trustText:'Phát triển cho nghiên cứu an toàn thông tin tại USTH',scannerTitle:'Kiểm tra đường liên kết',scannerDescription:'Dán URL nghi ngờ để xem đánh giá minh họa từ giao diện.',scannerOnline:'SCANNER INTERFACE · DEMO MODE',inputLabel:'ĐỊA CHỈ WEBSITE CẦN KIỂM TRA',analyze:'Phân tích URL',scanHint:'Chế độ giao diện thử nghiệm: chưa kết nối API phân tích, không xác minh độ an toàn thực tế.',featuresTitle:'Bảo vệ từ những tín hiệu nhỏ nhất',featuresDescription:'Một trải nghiệm trực quan, được thiết kế để phát triển thành hệ thống phát hiện rủi ro thực tế.',feature1Title:'Phân tích URL',feature1Body:'Điểm bắt đầu cho quy trình kiểm tra liên kết, tên miền và các dấu hiệu đáng ngờ.',feature2Title:'Đánh giá rủi ro',feature2Body:'Không gian hiển thị mức độ nguy cơ và giải thích các tín hiệu phát hiện.',feature3Title:'Báo cáo minh bạch',feature3Body:'Báo cáo dễ đọc, sẵn sàng tích hợp dữ liệu từ backend và các nguồn kiểm chứng.',reportTitle:'Bảng báo cáo rủi ro',reportDescription:'Khu vực kết quả sẽ cập nhật khi hệ thống phân tích được kết nối.',demoBadge:'DEMO / CHƯA KẾT NỐI API',latestAssessment:'KẾT QUẢ KIỂM TRA',emptyTitle:'Chưa có kết quả phân tích',emptyBody:'Nhập một URL phía trên để xem bản xem trước. Kết quả xác minh thực tế sẽ có sau khi kết nối backend.',riskLevels:'THANG MỨC ĐỘ RỦI RO',riskLow:'Thấp',riskMedium:'Trung bình',riskHigh:'Cao',riskNote:'Thang mức độ là thiết kế giao diện. Chưa có mô hình AI hay dịch vụ đánh giá nào đang hoạt động trên trang này.',ctaTitle:'Một cú nhấp an toàn bắt đầu từ sự cảnh giác.',ctaBody:'Cùng xây dựng môi trường số đáng tin cậy hơn thông qua công nghệ và nhận thức an toàn thông tin.',ctaButton:'Thử giao diện quét',footerText:'Dự án nghiên cứu sinh viên · Lấy cảm hứng từ USTH · Không phải trang web chính thức của trường.',loginTitle:'Đăng nhập',emailLabel:'Email',passwordLabel:'Mật khẩu',loginDemo:'Giao diện minh họa. Chưa có hệ thống xác thực, dữ liệu đăng nhập không được gửi đi.',invalidUrl:'Vui lòng nhập URL hợp lệ bắt đầu bằng http:// hoặc https://.',previewTitle:'Đã nhận URL để xem trước',previewWarning:'Chưa thể xác định mức độ rủi ro. Trang này chưa kết nối backend, mô hình AI hoặc nguồn threat intelligence.',loginUnavailable:'Đăng nhập chưa được kích hoạt. Vui lòng kết nối backend xác thực trước khi sử dụng.'},
  en: {navScan:'URL Scanner',navFeatures:'Features',navReport:'Risk Report',login:'Sign in',eyebrow:'ONLINE THREAT DETECTION PLATFORM',heroTitle:'Stay safer in<br><span>the digital world.</span>',heroDescription:'Spot suspicious links, assess potential risks, and receive clear warnings — before you click.',startScan:'Start scanning',learnMore:'Explore platform',trustText:'Built for cybersecurity research at USTH',scannerTitle:'Check a suspicious link',scannerDescription:'Paste a URL to preview the interface workflow.',scannerOnline:'SCANNER INTERFACE · DEMO MODE',inputLabel:'WEBSITE ADDRESS TO CHECK',analyze:'Analyze URL',scanHint:'Interface demo only: no analysis API is connected and URL safety is not verified.',featuresTitle:'Protection starts with the smallest signals',featuresDescription:'An intuitive experience designed to grow into a real-world threat detection platform.',feature1Title:'URL Analysis',feature1Body:'A starting point for inspecting links, domains, and suspicious indicators.',feature2Title:'Risk Assessment',feature2Body:'A dedicated space for risk levels and explanations of detected signals.',feature3Title:'Transparent Reports',feature3Body:'Readable reports ready for backend data and multiple verification sources.',reportTitle:'Risk assessment report',reportDescription:'Results will appear here once the analysis engine is connected.',demoBadge:'DEMO / API NOT CONNECTED',latestAssessment:'SCAN RESULT',emptyTitle:'No analysis results yet',emptyBody:'Enter a URL above to see a preview. Actual verification requires a connected backend.',riskLevels:'RISK LEVEL GUIDE',riskLow:'Low',riskMedium:'Medium',riskHigh:'High',riskNote:'These levels are interface placeholders. No AI model or risk assessment service is currently active.',ctaTitle:'A safer click starts with awareness.',ctaBody:'Building a more trustworthy digital environment through technology and cybersecurity awareness.',ctaButton:'Try the scanner UI',footerText:'Student research project · Inspired by USTH · Not an official university website.',loginTitle:'Sign in',emailLabel:'Email',passwordLabel:'Password',loginDemo:'Demo interface only. No authentication service is connected; credentials are not transmitted.',invalidUrl:'Enter a valid URL starting with http:// or https://.',previewTitle:'URL received for preview',previewWarning:'Risk level cannot be determined. This site has no connected backend, AI model, or threat intelligence feed.',loginUnavailable:'Sign-in is not active yet. Connect an authentication backend to enable it.'}
};
let currentLanguage='vi';
let lastPreview='';
const byId=id=>document.getElementById(id);
function t(key){return translations[currentLanguage][key]||key;}
function setLanguage(lang){
  if(!translations[lang])return;
  currentLanguage=lang;
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{el.innerHTML=t(el.dataset.i18nHtml);});
  document.querySelectorAll('.lang-btn').forEach(btn=>{const active=btn.dataset.lang===lang;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
  if(lastPreview)showPreview(lastPreview);
  try{localStorage.setItem('scamshield-language',lang);}catch(_){/* storage optional */}
}
function showPreview(url){
  // Only textContent is used for user-supplied URLs; never render them as HTML.
  const result=byId('reportResult');
  result.replaceChildren();
  const icon=document.createElement('div');icon.className='report-empty-icon';icon.textContent='⌕';
  const title=document.createElement('h3');title.textContent=t('previewTitle');
  const address=document.createElement('p');address.className='preview-url';address.textContent=url;
  const warning=document.createElement('p');warning.className='preview-warning';warning.textContent=t('previewWarning');
  result.append(icon,title,address,warning);
}
document.querySelectorAll('.lang-btn').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.dataset.lang)));
byId('scanForm').addEventListener('submit',event=>{
  event.preventDefault();
  const raw=byId('urlInput').value.trim();
  const error=byId('formError');error.hidden=true;
  let parsed;
  try{parsed=new URL(raw);}catch(_){parsed=null;}
  if(!parsed||!['http:','https:'].includes(parsed.protocol)||!parsed.hostname){error.textContent=t('invalidUrl');error.hidden=false;return;}
  lastPreview=raw;
  showPreview(raw);
  byId('report').scrollIntoView({behavior:'smooth',block:'start'});
});
const dialog=byId('loginDialog');
byId('openLogin').addEventListener('click',()=>dialog.showModal());
byId('closeLogin').addEventListener('click',()=>dialog.close());
byId('loginForm').addEventListener('submit',event=>{event.preventDefault();byId('loginMessage').textContent=t('loginUnavailable');});
byId('menuToggle').addEventListener('click',()=>{const nav=document.querySelector('.main-nav');const open=nav.classList.toggle('open');byId('menuToggle').setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.main-nav a').forEach(link=>link.addEventListener('click',()=>{document.querySelector('.main-nav').classList.remove('open');byId('menuToggle').setAttribute('aria-expanded','false');}));
byId('year').textContent=new Date().getFullYear();
let initial='vi';try{initial=localStorage.getItem('scamshield-language')||'vi';}catch(_){/* storage optional */}
setLanguage(initial);
