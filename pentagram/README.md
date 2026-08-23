# Handoff: Pentagram Label Site Redesign

## Overview

**Pentagram(펜타그램)** — YNK미디어 산하 판타지·무협 전문 웹소설 레이블 사이트의 리디자인 패키지. 이 핸드오프는 3가지 서로 다른 아트 디렉션 변형(variants)을 포함합니다. 각 시안은 원본 사이트(https://webnovelpentagram.netlify.app)를 대체하기 위한 완전한 랜딩 페이지 구성이며, 최상위 목표는 **① 레이블 브랜딩**과 **② 작가 투고 유치**입니다.

3가지 시안:
1. **V1 · Moonlit Archive** (달빛 서고) — 짙은 남색 배경 + 금박 세리프. 산수 시네마틱 히어로. 가장 안정적/관습적 방향.
2. **V2 · Five Stars** (다섯 별의 결사) — 흑지 + 금박 + 주묵(붉은 인장). 오각형 인터랙션과 타로 카드 스택. 가장 실험적 방향.
3. **V5 · Arcane Fantasy** (서양 판타지) — 짙은 자주 + 금색, 마법진 배경, 그리모어(마법서) 감성. 무협/한자 요소 없음, 순수 판타지.

번호가 1, 2, 5인 이유: 개발 과정에서 V3(서권/브루탈리스트), V4(모던 미니멀) 시안은 사용자 요청으로 삭제되었기 때문. 남은 3개 시안이 최종본입니다.

## About the Design Files

이 번들의 모든 파일은 **HTML로 만든 디자인 레퍼런스(prototype)** 입니다 — 최종 룩앤필과 인터랙션을 보여주는 목업이며, 그대로 프로덕션에 붙여넣기 위한 코드가 아닙니다.

개발자의 과제는 **각 시안(또는 확정된 한 시안)을 실제 코드베이스의 환경에서 재구현**하는 것입니다. React/Next.js/Vue/SvelteKit 등 프로젝트의 프레임워크와 기존 패턴을 따르세요. 프로젝트에 아직 프레임워크가 없다면, 이 사이트는 **콘텐츠 중심의 정적 랜딩 페이지 + 데이터 fetch 정도의 단순한 인터랙션**이므로 **Next.js(App Router) + 정적 렌더링**이 가장 자연스럽습니다.

## Fidelity

**High-fidelity (hifi)**. 최종 컬러, 타이포그래피, 스페이싱, 인터랙션이 확정된 픽셀-퍼펙트 목업입니다. 개발자는 아래 값들을 그대로 재현해야 합니다. 다만 애니메이션 세부 이징/duration은 아래 명시된 값을 기준선으로 삼되, 성능/접근성에 따라 조정 가능합니다.

## Structure

3개 시안은 각각 독립된 HTML 파일이며, 상단의 `index.html`은 iframe 스위처로 3개를 탭 형태로 전환합니다. 프로덕션에서는 **하나의 시안을 골라 라우팅** 하면 됩니다 (스위처 자체는 프로덕션 UI가 아님).

3개 시안 모두 동일한 **콘텐츠 구조**를 공유합니다:

| # | Section | 목적 |
|---|---------|------|
| 01 | **Hero** | 키비주얼 + 카피 + 투고 CTA |
| 02 | **About** (Order / 소개) | 레이블 소개, 신조/원칙 3개 |
| 03 | **Genres/Stars** *(V2 전용)* | 오각형 별자리 UI로 5개 장르 표현 |
| 04 | **Works** (Shelf / Grimoire / Tarot) | 실제 작품 리스트 — 장르 필터 |
| 05 | **Chronicle** | 뉴스/공지 타임라인 |
| 06 | **Authors** (Fellows / Scribes) | 저자 카드 그리드 (works.json에서 자동 그룹핑) |
| 07 | **Contact** (Oath) | 투고 요강 카드 + 이메일 링크 |
| 08 | **Footer** | 카피라이트 |

## Data — works.json (공통)

3개 시안 모두 `assets/works.json`에서 작품 데이터를 fetch합니다. 프로덕션에서는 CMS/API/정적 JSON 어느 방식이든 동일한 스키마를 유지하면 됩니다.

**스키마:**
```ts
type Work = {
  id: number;
  file: string;            // 표지 파일명 (assets/covers/ 하위)
  title: string;           // 작품명
  author: string;          // 작가명
  genre: 'fantasy'|'wuxia'|'modern'|'alt'|'sf';
  genreKo: string;         // '판타지' | '무협' | '현대판타지' | '대체역사' | 'SF'
  genreEn: string;         // 'Fantasy' | 'Wuxia' | 'Modern Fantasy' | 'Alt History' | 'Science Fiction'
  tag: '' | 'NEW' | 'HIT'; // 배지 (V1에서 사용)
}
```

**현재 데이터: 17개 작품** (`assets/works.json` 참조). 표지 이미지는 원본 사이트에서 다운로드된 실제 표지 17장 (`/covers/*.jpg`).

**장르 카운트/저자 카드는 works.json 데이터를 클라이언트 사이드에서 groupBy로 자동 산출**합니다. 하드코드된 숫자 없음.

---

## V1 · Moonlit Archive — 달빛 서고

파일: `variants/v1-moonlit.html`

### Color Tokens (V1)
```css
--bg:       #0b1220;   /* deep navy */
--bg2:      #0f1728;
--bg3:      #151f34;
--ink:      #e9e4d4;   /* aged parchment */
--ink-mute: #8a92a8;
--gold:     #c8a55b;
--gold-hi:  #e6c574;
--line:     #1e2a44;
--line2:    #2c3a58;
```

### Typography (V1)
- 국문 서체: **Noto Serif KR** (300, 400, 500, 600, 700, 900)
- 라틴 액센트: **Cormorant Garamond** (italic, 400-700)
- UI/영문 서체: **Pretendard**
- 문학적, 무협 감성 — 세리프 헤드라인 중심

### Layout notes
1. **Nav** — fixed, height 24px padding, 스크롤 60px 이상시 background rgba(11,18,32,.94) + backdrop-filter blur(12px)
2. **Hero** — 100vh, 배경 `/assets/hero-moonlit.jpg` (안개 낀 산수화). 좌측 정렬 히어로카피, 우측 하단에 세로 라벨 "EST. MMXVI · MOONLIT ARCHIVE"
3. **Rolling Covers** — 히어로 아래 얇은 스트립. 60초 무한 롤링 마퀴, 표지 180px 너비, gap 24px. hover시 애니메이션 pause. 양쪽 그라디언트 페이드.
4. **About** — 3개 원칙 카드 (세로 라인 divider, 큰 이탈릭 숫자 워터마크)
5. **Shelf** — 6개 장르 탭 (활성시 하단 gold 언더라인) → CSS grid `repeat(auto-fill, minmax(230px, 1fr))` gap 32px 28px. 각 카드는 표지 이미지(aspect-ratio 2/3) + 하단 캡션 (장르/제목/저자). hover시 translateY(-6px) + gold border
6. **Chronicle** — 4열 grid (날짜 120px, 태그 84px, 제목 flex, 화살표 auto). Tag colors: launch=gold-bg, deal=gold-border, event/notice=default
7. **Authors** — `repeat(auto-fill, minmax(220px, 1fr))` grid, 1px background line 사용 (각 셀 사이 hairline). 저자 initial을 큰 세리프 글리프로 표시
8. **Contact** — 다크 카드 + 4열 grid 요강. 골드 border + 코너 장식

### Interactions (V1)
- **Nav scroll**: 60px 스크롤시 `.scrolled` 클래스 토글
- **Genre tabs**: 클릭시 works 배열 필터링, 활성 탭 표시
- **Rolling marquee**: CSS keyframes `roll` 60s linear infinite, hover-pause
- **Card hover**: transform translateY(-6px), gold border, box-shadow 확장, image scale(1.06)
- 애니메이션 duration 기준: 22~35ms 짧은 hover, 300ms 페이지 로드 페이드

---

## V2 · Five Stars — 다섯 별의 결사

파일: `variants/v2-fivestars.html`

### Color Tokens (V2)
```css
--bg:        #0a0a0d;    /* obsidian */
--bg2:       #12121a;
--ink:       #f4ecdb;    /* aged paper */
--ink-mute:  #a8a091;
--gold:      #c8a44a;    /* dulled gold */
--gold-hi:   #e6c874;
--vermilion: #a02c22;    /* seal red */
--line:      #2a2a35;
```

### Typography (V2)
- 국문 서체: **Noto Serif KR** 300/400/500/600/700/900
- 라틴 액센트: **Cormorant Garamond** (italic)
- 라틴 대문자: **Cinzel** (letter-spacing 0.5em+)
- UI: **Pretendard**
- Roman numerals(I, II, III, IV, V) 강조 — 결사(結社) 컨셉

### Key experimental UI

**1. Pentagram Stage (Section 03)**
- 720px 정사각형 stage 안에 5개 장르 노드가 오각형 꼭짓점에 배치
- SVG로 stroke-dasharray draw-in 애니메이션 (오각형 5개 line, 각 0.1~1.1s delay)
- 노드 hover시: star icon scale(1.4) rotate(72deg) + glow, 한자 kanji가 gold로 변화 + text-shadow
- 마우스 이동시 각 노드가 살짝 parallax (mousemove listener, 노드마다 다른 depth 8~20px)
- 중앙에는 "五" (다섯 오) 한자 + PENTAGRAM 라벨

**2. Tarot Deck (Section 04)**
- 카드 스택 UI. 5장 이상이 데크 형태로 겹쳐진 상태로 표시, 좌우 화살표/드래그로 넘김
- 카드 사이즈: 300x450px (모바일 220x340). aspect-ratio 2:3에 실제 표지 이미지가 fill
- 카드 위에 오버레이: 상단 우/좌 코너에 Roman numeral (I, II, III...), 하단에 gradient overlay + 제목/저자/장르
- 스택 위치: 
  - rel === 0: 중앙 (scale 1, z 100)
  - rel === 1: +190px, rotate 8deg, scale 0.9
  - rel === 2: +340px, rotate 14deg, scale 0.8
  - rel === n-1: -190px, rotate -8deg
  - rel === n-2: -340px, rotate -14deg
  - 그 외: 뒤로 숨김 (opacity 0)
- Transition: `transform .6s cubic-bezier(.2,.9,.3,1), opacity .4s`
- Drag: pointerdown/pointerup, dx > 40 → prev, dx < -40 → next
- Keyboard: ArrowLeft/Right (works 섹션이 뷰포트에 있을 때만)

**3. Cursor (desktop only)**
- Custom dot(8px) + ring(36px)을 mouse follow. ring은 requestAnimationFrame lerp(.18)
- Interactive elements hover시 ring이 70x70px + gold-hi border-color
- `@media (hover: hover)` 조건으로 desktop만 활성화

**4. Contact = "Oath / 서약"**
- 골드 border + corner ornaments
- 상단에 vermilion(붉은) `印` 봉인 도장 (rotate -6deg)
- 2열 grid로 투고 요강 (Genre/Volume/Address/Reply)
- 하단에 gold CTA "서약서를 보내다 · SUBMIT"

### Effects (V2)
- **Film grain overlay**: fixed inset:0, SVG feTurbulence noise, opacity 0.08, mix-blend-mode overlay, z-index 200
- **Pentagram slow spin**: 히어로 배경 오각형 SVG, animation `spin 120s linear infinite`

---

## V5 · Arcane Fantasy — 서양 판타지

파일: `variants/v5-arcane.html`

**중요: 이 시안에는 한자(漢字), 서권(書卷), 무협적 요소가 일절 없습니다.** 완전히 서양 판타지 감성 — 마법진, 룬, 마법서(grimoire), 성단(constellation), 고딕 아치.

### Color Tokens (V5)
```css
--bg:       #0d0a1a;   /* deep midnight violet */
--bg2:      #151129;
--bg3:      #1e1836;
--ink:      #f0e6d2;   /* aged parchment */
--ink-mute: #9a8fb3;
--ink-warm: #d4c39c;
--gold:     #d4af5c;
--gold-hi:  #f5d789;
--gold-dim: #8a7440;
--violet:   #7b5cbb;
--plum:     #5a2d5c;
--emerald:  #4a8f7a;
--line:     #332957;
--line2:    #4a3e77;
```

Body에 두 개의 radial gradient 오버레이 (`10% 30% plum`, `90% 70% emerald`)로 대기감 조성. 위에 SVG turbulence noise overlay(opacity .5, blend overlay).

### Typography (V5)
- 헤딩: **Cinzel Decorative** 400/700 (로마 대문자 감성)
- 서브 라틴: **Cinzel** (500, 600, 700)
- 세리프 본문: **Cormorant Garamond** (300, 400, 500, 600, italic)
- UI/국문: **Pretendard**
- 국문은 세리프가 아니라 **본문 언어일 뿐** — 감성 자체는 라틴 세리프가 담당

### Key visual elements

**1. Hero**
- 배경 `/assets/hero-arcane.jpg` — 마법진 + 룬 + 고딕 아치 실루엣의 밤하늘. brightness(.55) contrast(1.05) saturate(1.05)
- 배경 위에 **회전하는 SVG 마법진 링 2개**: 
  - 큰 링 (640px): opacity 0.35, `rot 180s linear infinite`
  - 작은 링 (420px): opacity 0.5, `rot 90s linear infinite reverse`
- 히어로 카피는 중앙 정렬, `Cinzel Decorative` 대형 헤딩 "Where *tales* become *stars*"
- 히어로 밑에 gold CTA "Submit a Manuscript" + ghost "Open the Grimoire"

**2. About = Grimoire spread**
- 2페이지 펼침 마법서 형태 (1fr 60px 1fr grid, 중앙 spine에 별 SVG)
- 각 페이지에 dropcap (`::first-letter` 5.5em Cinzel Decorative 700 gold + text-shadow glow)
- 3개 Rite (Rite I/II/III) 카드는 원형 sigil 아이콘 + 라틴 라벨

**3. Works = Grimoire tomes**
- 그리드 `repeat(auto-fill, minmax(240px, 1fr))` gap 32px
- 각 tome은 표지 이미지 + 4개 코너 장식(gold L자) + 이중 gold frame + 상단에 "Vol · I/II/III..." 리본
- hover: translateY(-8px), image scale(1.06), border gold, glow shadow

**4. Authors = Medallions**
- 4열 grid. 각 카드에 원형 gold sigil (SVG, 카드마다 다른 형태 — pool 10개에서 rotate)
- Sigil hover: rotate(180deg) transition 0.4s
- 카드 hover: translateY(-4px), gold border

**5. Contact = "Oath of the Order"**
- 상단 봉인 (gold border circle, 안에 별 SVG, plum radial gradient bg, box-shadow gold)
- 이중 gold double-border 카드
- 4개 corner marks (14px L-shapes with L-line pattern)

### Effects (V5)
- **Dust particles**: fixed body::before, 여러 개 radial-gradient dots (다양한 사이즈/포지션), opacity 0.7
- **Paper texture**: body::after, SVG turbulence noise, blend overlay, opacity 0.5
- **Rune ring rotation**: `@keyframes rot { to { transform: translate(-50%,-50%) rotate(360deg) } }`

---

## Screens — 각 섹션 상세

### 01. Hero (공통 구조, 시안별 스타일링)
- **Purpose**: 방문자에게 즉시 브랜드 감성 전달 + 투고 CTA 제시
- **CTAs**: 항상 primary가 "투고하기 / Submit", secondary가 "작품 보기 / Open Works"
- **Copy variants**:
  - V1: "달빛이 닿지 않는 산 너머의 이야기를 기록하는 곳."
  - V2: "다섯 개의 별이 하나의 이야기가 될 때"
  - V5: "Where *tales* become *stars*."
- **Height**: min-height 100vh, padding-top으로 fixed nav(74px) 확보

### 02. About / Order
- **Layout**: 헤더 → 리드 인용문 → 3개 원칙 카드 (grid 3열)
- **3원칙 (모든 시안 공통 메시지)**:
  1. 세계관을 훼손하지 않는다 (Preserve the World)
  2. 동료로서 함께 간다 (Walk Together)
  3. 장르는 서로를 비춘다 (Five Stars, One Sky)

### 03. Genres — V2 전용
- **Interaction**: 오각형 정점에 배치된 5개 장르 노드. 마우스 parallax + hover animation.
- **Data**: works.json에서 장르별 카운트 자동 산출
- **Genres 배치** (top / left %):
  - Fantasy 幻:      6% / 50%   (상단)
  - Wuxia 武:       38% / 94%   (우상)
  - Modern 現:      88% / 74%   (우하)
  - Alt History 史: 88% / 26%   (좌하)
  - SF 宙:          38% / 6%    (좌상)

### 04. Works
- **V1**: 6장르 tab + 표지 그리드 (auto-fill minmax 230px)
- **V2**: 타로 카드 스택 (인터랙티브 넘김, 5장 이상)
- **V5**: 6장르 tab + tome 그리드 (auto-fill minmax 240px)
- **Filter behavior**: 클릭시 works.json에서 `genre === selected` 필터, 'all'이면 전체

### 05. Chronicle (뉴스)
- **Format**: 날짜 · 태그 · 제목 · 화살표 (4열 grid)
- **Tag types**: LAUNCH (강조 배경), DEAL (강조 border), EVENT/NOTICE (기본)
- **Data**: 현재는 하드코드. 실제 CMS 연결시 별도 API/JSON 스키마 필요:
  ```ts
  type NewsItem = { date: string; type: 'launch'|'deal'|'event'|'notice'; title: string; href: string; }
  ```

### 06. Authors
- **Data source**: works.json을 `groupBy(author)`. 각 저자 카드는 이름 + 장르 + 대표작 최대 2편.
- **Layout**: 4열 grid (또는 auto-fill minmax 220px)

### 07. Contact / Oath
- **Content**: 투고 요강 4~5항목 (장르, 분량, 서류/포맷, 답신 기간, 이메일)
- **CTA**: `mailto:submit@pentagram.co.kr` 링크 버튼
- **필수 표기**: "영업일 기준 14일 이내 답신"

---

## Design Tokens (통합)

전역 tokens는 시안별로 나뉘지만, 공통 원칙:

### Spacing scale (모든 시안)
```
XS: 4px / 8px
S:  12px / 16px
M:  20px / 24px / 28px
L:  32px / 40px / 44px
XL: 60px / 80px / 100px
2XL: 120px / 140px / 160px / 180px  (섹션 padding)
```

### Typography scale
- 헤더 1: clamp(38px, 7vw, 88px) — Hero H1
- 헤더 2: clamp(30px, 4.5vw, 56px) — Section title
- 헤더 3: 22–32px — Card/subsection
- 본문: 15–17px (line-height 1.7–1.9)
- 캡션: 11–13px, letter-spacing 0.1~0.5em (라틴 대문자 라벨)

### Border radius
- 카드: 0 (V2 흑지 감성) / 2px (V1 미묘한 rounding) / 0 (V5 tome)
- Pill/badge: 999px (일부 CTA)
- 이 사이트는 전체적으로 **flat/sharp**한 느낌 — 대형 rounded-lg는 사용하지 않음

### Shadows
- 카드 base: `0 20px 40~60px rgba(0,0,0,.5~.7)`
- Hover: `0 26~30px 60px [accent color with alpha .15~.28]`
- Nav scrolled: 없음 (border만)

---

## Assets

### 히어로 배경 (AI 생성)
- `assets/hero-moonlit.jpg` (2752×1536, ~8MB) — 안개 낀 동아시아 산수, 오각형 별자리, 초승달. V1 히어로.
- `assets/hero-fivestars.jpg` (2752×1536, ~6.6MB) — 우주 배경에 오각형 별자리, 잉크 소용돌이. V2 히어로.
- `assets/hero-arcane.jpg` (2752×1536, ~7MB) — 마법진 + 룬 + 고딕 아치 실루엣의 밤하늘. V5 히어로.
- `assets/hero-scroll.jpg` — V3(삭제됨) 잔여물, 사용 안 함. 삭제 가능.

**주의**: 이 3장은 nano-banana-pro로 생성된 이미지입니다. 프로덕션에서는 저작권/일관성 확인 후 사용하거나, 저해상도 웹용으로 리사이즈/최적화 권장 (예: 1600px 폭, WebP 80% quality).

### 표지 이미지 (원본 사이트에서 다운로드)
`assets/covers/*.jpg` — 17장, 각 200~750KB, 1500×2100 (원본 유지). 파일 목록:
```
hert1.jpg    yo1.jpg     lege1.jpg   swo1.jpg    robot1.jpg
gidam1.jpg   do1.jpg     han1.jpg    ch1.jpg     gang1.jpg
un1.jpg      enter1.jpg  kni1.jpg    chowol.jpg  meth1.jpg
song1.jpg    top1.jpg
```
매핑은 `assets/works.json`을 참조.

### 폰트 (모두 Google Fonts / CDN)
- Noto Serif KR — Google Fonts
- Cormorant Garamond — Google Fonts
- Cinzel + Cinzel Decorative — Google Fonts
- Pretendard — jsdelivr CDN (`https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`)
- Instrument Serif + JetBrains Mono — Google Fonts (V4/삭제됨에서만 사용, V1/V2/V5는 미사용)

### 아이콘
- 모두 인라인 SVG (stroke 기반, 24×24 viewBox). 별도 아이콘 파일 없음.
- V5의 sigil은 10개 SVG pool을 저자 인덱스로 rotate.

---

## Interactions & Behavior

### Data loading (공통)
```js
fetch('../assets/works.json')
  .then(r => r.json())
  .then(data => {
    // works 렌더링
    // 장르 카운트 계산
    // authors groupBy 렌더링
  })
  .catch(err => console.warn('load failed', err));
```
프로덕션 (Next.js SSG/ISR)에서는 `getStaticProps` 또는 `fetch()` in Server Component로 대체.

### Navigation
- Fixed nav, 스크롤 60px 이상시 `.scrolled` 클래스 (background solid + backdrop-filter blur)
- Anchor 링크 (`#about`, `#works` 등) → smooth-scroll (CSS `scroll-behavior: smooth`)
- Mobile (`max-width: 900px`): menu 숨김 (햄버거 미구현 — 프로덕션에서 추가 필요)

### Genre filter
- Tab button 클릭 → `filter` state 갱신 → array filter 후 다시 render
- 활성 탭 시각적 표시: V1은 하단 gold 언더라인, V5는 배경 tint + gold-hi 색상

### Tarot deck (V2 전용)
- Prev/Next 버튼, 좌우 화살표 키, 드래그 제스처 지원
- 카드 스택 layout은 rel index 기준 6종 위치로 하드코드
- Keyboard 리스너는 `#contents` 섹션이 뷰포트에 있을 때만 활성

### Cursor effect (V2 데스크톱 전용)
- `matchMedia('(hover:hover)').matches` 체크
- 이벤트 위임: `a, button, .genre-node, .author-card, .tarot-card` hover시 ring 확대
- 접근성: 시스템 커서를 완전히 숨기지 않음 (dot/ring은 mix-blend-mode: screen)

### Hover transitions
- Card lift: transform translateY(-4~8px), 0.22~0.35s
- Image scale: 1.06, 0.5s
- Border/shadow color 변화: 0.25s

### Animations
- Hero rings (V5): 90/180초 linear infinite (성능 이슈 없음, GPU-accelerated transform)
- Pentagram spin (V2): 120초 linear infinite
- Marquee roll (V1): 60초 linear infinite, hover-pause
- Pentagram lines draw-in (V2): stroke-dashoffset 3s ease, 각 line 0.25s stagger

### Responsive
- Breakpoint 하나: `@media (max-width: 900px)`
- 900px 이하: 메뉴 hide, section-index hide, 카드 그리드 1~2열로, 큰 폰트 스케일 축소, cursor 커스텀 hide

---

## Recommended Implementation

### Framework
프로젝트에 정해진 프레임워크가 없다면 **Next.js 15+ (App Router)** 권장:
- 정적 콘텐츠 위주 → SSG로 빠른 로드
- `app/page.tsx`가 랜딩 페이지, 시안 확정 시 하나의 파일에 통합
- `works.json`은 `data/works.json`으로 이동해 build-time import
- 각 섹션을 별도 컴포넌트로 분리: `<Hero>`, `<About>`, `<Works>`, `<Chronicle>`, `<Authors>`, `<Contact>`
- 이미지는 `next/image`로 최적화 (표지 각 750KB → WebP로 절반 이하)

### Styling
- **Tailwind CSS 권장** — 이 디자인의 spacing/typography scale은 Tailwind 기본과 잘 매칭됨
- 시안별 컬러는 CSS custom properties로 root에 선언, Tailwind config에서 참조
- 세리프 폰트 3종(Noto Serif KR / Cormorant / Cinzel)은 `next/font/google`로 pre-load

### 인터랙션 라이브러리
- Tarot deck 애니메이션 → **Framer Motion** (`layoutId`, `animate` prop)로 쉽게 재현 가능
- Scroll fade-in → **CSS `@keyframes fade`** 또는 Framer Motion `whileInView`
- 커스텀 커서 → **`useMotionValue` + `useSpring`** 조합

### Accessibility 체크리스트 (프로덕션 필수)
- [ ] 커스텀 커서는 데스크톱 hover-only. `prefers-reduced-motion` 시 애니메이션/spin ring disable
- [ ] Genre filter 버튼에 `aria-pressed` 상태
- [ ] Tarot deck에 keyboard 지원 (ArrowLeft/Right) — 현재 구현됨. `role="region"` + `aria-live` 추가 권장
- [ ] Nav 링크는 `<a>` 태그 유지 (semantic)
- [ ] 표지 이미지 `alt` 텍스트 = 작품명 (현재 구현됨)
- [ ] Contrast: gold(#c8a44a) on obsidian(#0a0a0d) = ~7:1, 통과. `--ink-mute`(#a8a091) on bg = ~7:1 통과
- [ ] Focus visible: `outline: 2px solid var(--gold)` 등 추가 필요 (현재 미구현)

### SEO
- 메타 태그 (title, description, og:image) — 현재 V1/V2/V5 각 파일에 `<title>`만 있음
- 프로덕션에서는 `metadata` API (Next.js) 또는 Head 컴포넌트로 완전한 메타 세팅

---

## Files in this handoff

```
design_handoff_pentagram_redesign/
├── README.md                          ← 이 문서
├── index.html                         ← 3-way 시안 스위처 (참고용, 프로덕션 X)
├── variants/
│   ├── v1-moonlit.html               ← Variant 1
│   ├── v2-fivestars.html             ← Variant 2
│   └── v5-arcane.html                ← Variant 5
├── assets/
│   └── works.json                    ← 작품 데이터
└── ASSETS_NOTE.md                    ← 히어로/표지 이미지 취급 안내
```

**아래 이미지 자산은 사이즈가 크므로 이 번들에 포함하지 않았습니다.** 원본 프로젝트의 `assets/` 폴더에서 가져오세요:
- `assets/hero-moonlit.jpg` (~8 MB)
- `assets/hero-fivestars.jpg` (~6.6 MB)
- `assets/hero-arcane.jpg` (~7 MB)
- `assets/covers/*.jpg` (17 files, 총 ~10 MB)

## Next Steps

1. 3개 시안 중 프로덕션에 갈 하나를 확정 (또는 A/B test 셋업)
2. 프레임워크 결정 (권장: Next.js + Tailwind)
3. 이미지 자산 최적화 (WebP 변환, 리사이즈)
4. `works.json`을 CMS/DB로 이관하거나 정적 JSON 유지 결정
5. 뉴스/공지(Chronicle) 데이터 스키마 확정 및 API 연결
6. 투고 이메일(`submit@pentagram.co.kr`) 실계정 세팅 또는 폼 백엔드 연결
7. 접근성/SEO/성능 감사 (Lighthouse)
