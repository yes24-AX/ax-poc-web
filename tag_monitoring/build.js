/* harness.html(datahub.Web 공통 CSS 전체) 의 #poc-slot 에 _content.html 을 끼워 index.html 을 만든다.
   node build.js                                                                     */
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let html = fs.readFileSync(path.join(dir, 'harness.html'), 'utf8');
const content = fs.readFileSync(path.join(dir, '_content.html'), 'utf8').trim();

function replace(from, to, label) {
  if (html.indexOf(from) === -1) throw new Error('치환 대상을 찾지 못함: ' + label);
  html = html.split(from).join(to);
}

// 1) 폰트 — 로컬 Paperlogy woff2 를 넣었으므로 harness 의 폰트 셀렉터를 paperlogy 로 전환
replace("data-font=\"pretendard\"", "data-font=\"paperlogy\"", 'html data-font');
replace("setAttribute('data-font','pretendard')", "setAttribute('data-font','paperlogy')", 'script data-font');
replace('<span class="font-selector-label">Pretendard</span>', '<span class="font-selector-label">Paperlogy</span>', 'font label');

// 1-1) harness 인라인 @font-face 는 폰트 파일이 HTML 옆에 있다고 가정한다.
//      실제 파일은 assets/fonts/paperlogy/ 에 두었으므로 경로만 교정한다.
html = html.split('url(Paperlogy-').join('url(assets/fonts/paperlogy/Paperlogy-');

// 2) 문서 제목
replace('<title>AX Datahub</title>', '<title>태그 모니터링 · AX Datahub</title>', 'title');

// 3) 페이지 전용 CSS
replace('</head>', '<link rel="stylesheet" href="assets/css/page.css">\n</head>', 'head close');

// 4) 사이드바 메뉴 / 브레드크럼
replace(
  '<li class="nav-item"><a href="#" class="nav-item-btn active"><span class="nav-icon-badge"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></span><span class="nav-item-text">홈</span></a></li>',
  '<li class="nav-item"><a href="#" class="nav-item-btn"><span class="nav-icon-badge"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg></span><span class="nav-item-text">홈</span></a></li>',
  'nav 홈');
replace(
  '<span class="nav-item-text">클릭스트림</span></a></li>',
  '<span class="nav-item-text">클릭스트림</span></a></li>\n<li class="nav-item"><a href="#" class="nav-item-btn active"><span class="nav-icon-badge"><svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 7h.01"/><path d="M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8L3 11z"/></svg></span><span class="nav-item-text">태그 모니터링</span></a></li>',
  'nav 태그 모니터링');
replace('<span class="sidebar-group-count">3</span>', '<span class="sidebar-group-count">4</span>', 'group count');
replace(
  '<span class="header-breadcrumb-group">분석</span><span class="header-breadcrumb-sep">›</span><span class="header-breadcrumb-current">홈</span>',
  '<span class="header-breadcrumb-group">분석</span><span class="header-breadcrumb-sep">›</span><span class="header-breadcrumb-current">태그 모니터링</span>',
  'breadcrumb');

// 5) 본문 + 스크립트
replace('<main id="poc-slot"></main>', '<main id="poc-slot">\n' + content + '\n</main>', 'poc-slot');
replace('</body>',
  '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>\n'
  + '<script src="assets/js/data.js"></script>\n'
  + '<script src="assets/js/app.js"></script>\n</body>', 'body close');

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('index.html 생성 완료 —', (html.length / 1024).toFixed(0) + 'KB');
