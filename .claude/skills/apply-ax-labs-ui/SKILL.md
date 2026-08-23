---
name: apply-ax-labs-ui
description: Apply the ax-labs-platform visual design system (the same look used by its Contents/ContentPackage "콘텐츠 패키지 생성" page — vercel/shadcn oklch theme, Paperlogy font, sidebar+header app shell, card/btn/badge/pill components) to a POC page being built in ax-poc-web. Use this whenever the user asks to build, restyle, or "make it look like" a new POC page in this repo, whenever they mention ax-labs-platform, AX Labs, "콘텐츠 패키지 UI/스타일", or say the current UI looks bad/generic and should match the platform. Also use it proactively when starting any brand-new POC page here, since ax-poc-web pages default to this look unless the user says otherwise.
---

# ax-labs-platform UI 적용

ax-poc-web은 `ax-labs-platform`(형제 저장소, 실서비스 MD 도구)에 실서비스 적용 여부를
검토하기 위한 POC를 만드는 곳이다. 그래서 새 POC 페이지는 특별한 이유가 없는 한
**ax-labs-platform과 시각적으로 동일한 디자인 시스템**을 써야 실무자가 "실제 적용됐을 때
어떻게 보일지"를 바로 판단할 수 있다. 이 스킬은 그 디자인 시스템(vercel 테마의 oklch 토큰,
Paperlogy 폰트, 사이드바+헤더 앱 셸, card/btn/badge/pill 등 공유 컴포넌트)을 매번
`ax-labs-platform` 소스를 처음부터 grep하지 않고 바로 적용하기 위한 번들이다.

## 왜 번들이 필요한가

이 디자인 시스템을 처음 추출할 때는 `themes.css`, `dashboard.css`,
`pages/Contents.ContentPackage.css`, `_Layout.cshtml`, `Components/Sidebar/Default.cshtml`을
전부 열어 토큰과 클래스를 하나씩 확인해야 했다 — 여러 차례의 grep/read가 필요한 작업이다.
이미 그 결과를 `assets/style-base.css`(토큰 + 공유 컴포넌트 CSS 전체)와
`assets/fonts/paperlogy/`(woff2 9종 + @font-face 정의)에 담아뒀으므로, **왠만하면 이 자산을
그대로 복사해서 시작**하고, 원본을 다시 열어보는 것은 다음 두 경우로 한정한다:
- 번들에 없는 컴포넌트가 필요할 때 (`references/design-tokens.md`의 원본 소스 표 참고)
- 플랫폼이 업데이트되어 토큰/컴포넌트가 바뀐 것 같을 때 (`references/design-tokens.md` 참고)

## 적용 절차

1. **자산 복사** — 대상 POC 페이지 폴더(예: `md_briefing/`, 새로 만드는 페이지면 새 폴더)에
   다음을 복사한다:
   - `assets/fonts/paperlogy/` → `<페이지폴더>/assets/fonts/paperlogy/` (통째로)
   - `assets/style-base.css` → `<페이지폴더>/assets/css/style.css` (시작점. 이후 페이지 전용
     클래스를 이 파일에 이어서 추가한다 — 새 파일로 쪼개지 않는다)

2. **HTML 셸 구성** — `assets/shell-skeleton.html`을 참고해 사이드바(로고 "AX"/"Labs",
   메뉴 그룹 라벨, 현재 페이지에 `active`, 하단 사용자) + top-header(브레드크럼, 모델 pill,
   다크모드 토글) + `page-heading`(h1 제목 + 서브타이틀)을 구성한다. 플레이스홀더
   (`{{PAGE_TITLE}}` 등)를 실제 값으로 채운다. 사이드바 메뉴 항목은 이 POC가 속한 도메인의
   다른 페이지들(실제로 존재하지 않아도 됨 — POC 컨텍스트를 보여주는 용도)을 몇 개 나열하고
   현재 페이지만 active로 표시한다.

3. **컴포넌트 재사용** — 검색창, 카드, 버튼, 배지, 상태 표시, 통계 카드, AI 분석 패널 등은
   `references/design-tokens.md`의 "컴포넌트 클래스 요약"에 있는 기존 클래스를 그대로
   쓴다. 절대 임의로 새 색상 hex나 별도 CSS 프레임워크를 섞지 않는다 — 이 페이지가
   플랫폼에 실제로 편입됐을 때 위화감이 없어야 하는 게 핵심이므로, 토큰 변수
   (`var(--primary)`, `var(--muted-foreground)` 등)만 사용한다.

4. **페이지 전용 컴포넌트 추가** — 이 POC만의 화면(차트, 특수 배지 등)이 필요하면
   `style.css` 안에 이어서 추가하되, 색상/반경/그림자는 항상 기존 토큰
   (`var(--border)`, `var(--radius)`, `var(--shadow-sm)` 등)을 참조해서 새로 만든다.
   SVG 차트를 그린다면 색을 인라인 hex로 굳히지 말고 CSS 클래스(`fill: var(--foreground)` 등)로
   빼서 다크모드 토글 시 자동으로 반응하게 한다 (`style-base.css` 하단의 `.bar-cur`,
   `.line-primary` 등이 실제 예시).

5. **다크모드 토글 확인** — 셸에 이미 다크모드 토글 버튼과 JS가 포함되어 있다
   (`shell-skeleton.html` 하단 script). 페이지를 다 만든 뒤 토글을 눌러 카드 배경, 텍스트,
   차트 색이 전부 따라 바뀌는지 확인한다 — 하드코딩된 색이 있으면 이 단계에서 드러난다.

6. **검증** — 브라우저 프리뷰가 가능하면 DOM으로 다음을 확인한다: 콘솔 에러 없음,
   `document.fonts.check('16px Paperlogy')`가 `true`, `.card`의 `border-radius`가
   토큰값(`calc(var(--radius) + 2px)` → 보통 10px)과 일치, 다크모드 토글 시
   `document.documentElement.classList.contains('dark')`가 정상 전환됨.
   스크린샷 도구가 타임아웃되는 환경이면 DOM 검증만으로 충분하며, 그 사실을 사용자에게
   알려준다 (무리하게 재시도하지 않는다).

## 주의사항

- **테마는 vercel(라이트)/dark 고정**. 플랫폼이 여러 테마를 지원한다고 다른 테마(claude,
  supabase 등)를 임의로 고르지 않는다 — 사용자가 명시적으로 다른 테마를 요청한 경우에만
  `references/design-tokens.md`의 원본 소스(themes.css)에서 해당 테마 토큰을 가져온다.
- **폰트는 로컬 파일로 서빙**한다 (Paperlogy는 Google Fonts 등 CDN에 없음). Pretendard는
  jsdelivr CDN 링크(`assets/style-base.css`가 이미 이 폴백을 전제로 함)를 그대로 써도 된다.
- 기존에 다른 색 팔레트(예: YES24 브랜드 블루)로 만들어진 POC를 이 스타일로 갈아엎을 때는
  페이지 로직(JS 데이터 흐름)은 그대로 두고 **CSS 클래스와 마크업만 교체**하면 된다 — 이
  스킬은 룩앤필 이식이지 기능 재작성이 아니다.
