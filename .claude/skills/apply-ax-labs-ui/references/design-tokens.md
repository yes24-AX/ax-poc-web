# ax-labs-platform 디자인 시스템 — 추출 스냅샷

`ax-labs-platform` (경로: `../ax-labs-platform` — ax-poc-web과 형제 디렉터리)의
`Views/Contents/ContentPackage.cshtml` + `wwwroot/css/{themes,dashboard}.css`에서
2026-07-07에 추출한 스냅샷이다. `assets/style-base.css`가 이 내용을 이미 CSS로 구현해뒀으니,
**보통은 이 문서를 읽을 필요 없이 style-base.css를 복사해 쓰면 된다.**

이 문서는 (1) style-base.css에 없는 클래스가 필요할 때 원본 위치를 빨리 찾기 위한 용도,
(2) 플랫폼이 업데이트되어 토큰이 바뀌었는지 의심될 때 대조하는 용도로만 참고한다.

## 원본 소스 위치 (재확인이 필요할 때)

| 내용 | 파일 |
|---|---|
| 컬러 토큰 (테마별 oklch) | `src/Labs.Web/wwwroot/css/themes.css` |
| 레이아웃 변수·셸(sidebar/header)·card/btn/badge 등 공통 컴포넌트 | `src/Labs.Web/wwwroot/css/dashboard.css` |
| 콘텐츠 패키지 페이지 전용 클래스 (product-layout, step-pill, poc-input 등) | `src/Labs.Web/wwwroot/css/pages/Contents.ContentPackage.css` |
| 페이지 마크업 예시 | `src/Labs.Web/Views/Contents/ContentPackage.cshtml` |
| 셸 마크업 (사이드바/헤더) | `src/Labs.Web/Views/Shared/_Layout.cshtml`, `Views/Shared/Components/Sidebar/Default.cshtml` |
| AI 요약 패널 공통 클래스 | `src/Labs.Web/wwwroot/css/components/ai-controls.css` |
| Paperlogy 폰트 원본 | `src/Labs.Web/wwwroot/css/paperlogy/*.woff2` (스킬 assets에 이미 복사돼 있음) |

## 테마: 기본값은 `vercel` (라이트) / `.dark` (다크)

플랫폼은 여러 테마(vercel, claude, supabase 등)를 지원하지만 **기본 테마는 vercel**이며,
니어블랙 primary + 무채색 oklch 팔레트가 특징이다. `style-base.css`의 `:root`와 `.dark`가
이 값을 그대로 담고 있다. 다른 테마가 필요하다는 요청이 없으면 vercel 그대로 쓴다.

핵심 토큰 이름과 의미 (oklch 형식, `L C H`):
- `--background` / `--foreground` — 페이지 배경/기본 텍스트
- `--card` / `--card-foreground` — 카드 배경/텍스트
- `--primary` / `--primary-foreground` — 버튼 등 강조색 (vercel은 검정/흰색)
- `--secondary`, `--muted`, `--accent` — 옅은 배경 계열 (hover, 보조 배지 등)
- `--muted-foreground` — 보조 텍스트(설명, 서브타이틀)
- `--destructive` — 위험/에러/부정 지표
- `--border`, `--input`, `--ring` — 테두리/포커스링
- `--sidebar*` — 사이드바 전용 변수 (배경이 본문과 미묘하게 다름)
- 커스텀 확장(플랫폼 dashboard.css 하단에 추가된 것, style-base.css에도 반영): `--success`, `--warning`, `--info`, `--violet` — AI/상태 강조에 사용

색을 하드코딩하지 말고 항상 이 변수를 참조한다. 강조 배경이 필요하면
`color-mix(in oklch, var(--primary) 10%, transparent)` 패턴을 쓴다 (플랫폼 전역 관례).

## 폰트

기본 폰트는 **Paperlogy** (locally hosted, weight 100~900), 폴백은 Pretendard → 시스템 산세리프.
`assets/fonts/paperlogy/`에 woff2 9종 + `paperlogy.css`가 이미 준비되어 있다.
숫자/코드류(상품번호, API 키 등)는 `var(--font-mono)`(모노스페이스)를 쓴다 — 플랫폼 관례.

## 컴포넌트 클래스 요약 (style-base.css에 이미 구현됨)

- **셸**: `.app-layout` > `.sidebar` + `.main-wrapper`(`.top-header` + `.page-content`)
- **페이지 헤딩**: `.page-heading` > `.page-heading-left`(`h1.page-title` + `.page-subtitle`) + `.page-header-actions`
- **카드**: `.card` > `.card-header`(`.card-title`, `.card-description`) + `.card-content`
  - 제목/설명을 세로로 쌓을 땐 `.card-header.card-header-col`
- **버튼**: `.btn` + `.btn-primary` / `.btn-outline` / `.btn-ghost` / `.btn-sm` / `.btn-lg` / `.btn-icon`
- **배지**: `.badge` + `.badge-primary` / `-secondary` / `-success` / `-warning` / `-danger`
- **필(pill)**: `.pill` (기본 회색) / `.pill-price` / `.pill-star` — ContentPackage 전용 강조 pill
- **상태 배지(dot)**: `.status-badge.status-selling` / `.status-low` / `.status-soldout`
- **단계 표시**: `.step-pills` > `.step-pill.active` (`.sp-num`, `.sp-arrow`)
- **검색/입력**: `.poc-search-row` > `.poc-input-wrap`(`.poc-input-icon` + `.poc-input`) + `.chip`(샘플 칩)
- **상품 히어로**: `.product-layout` > `.product-cover` + `.product-meta-area`(`.product-h2`, `.product-pills`, `.product-dl` > `.dl-row`, `.price-box`)
- **AI 패널**: `.ai-brief`(`.ai-brief-top` 그라디언트 바 + `.ai-brief-head`(`.ai-badge`) + `.ai-brief-body`(`.ai-verdict`, `.ai-summary`, `.ai-cols` > `.ai-col.problems`/`.actions`))
  - 로딩 연출: `.ai-thinking`(`.spin`) + `.shimmer.sk`
- **통계/차트 카드**: `.stat-card`(`.stat-head`, `.stat-num`, `.stat-sub`, `.delta.up/down/flat`), `.chart-card`, `.grid.grid-2/3/4`
- **빈 상태**: `.empty`

새 페이지에 필요한 컴포넌트가 이 목록에 없으면, 먼저 `references/design-tokens.md`의
원본 소스 표에서 해당 파일을 찾아 실제 정의를 확인한 뒤 같은 토큰 체계로 새로 만든다
(임의로 색을 하드코딩하지 않는다).
