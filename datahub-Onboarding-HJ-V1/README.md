# DataHub · The Data Instrument

귀여운 캐릭터나 생성 이미지 없이, 실제 업무 데이터가 하나의 정밀 계측 체계 안에서 정렬·연결·분석되고 실제 DataHub 화면으로 정착하는 독립형 온보딩 POC입니다.

## 실행

VS Code에서 이 폴더를 열고 `index.html`을 Live Server로 실행할 수 있습니다. 별도 빌드 과정은 없습니다.

```powershell
cd D:\Sources\DataHub-Onboarding-Data-Instrument-Standalone
npx --yes http-server . -p 5517 -c-1
```

브라우저에서 `http://127.0.0.1:5517/`을 엽니다. 정적 파일만 사용하므로 GitHub Pages에도 그대로 배포할 수 있습니다.

## 파일 구조

- `index.html`: 영속 업무 데이터 9개, 계측 장치, 스키마, 분석, Dashboard 도킹 DOM
- `css/instrument.css`: 전체 아트 시스템, CSS 3D, 반응형, reduced-motion
- `js/instrument-data.js`: 실제 업무 데이터, 지표, Kimi 문구, Dashboard 이동 주소
- `js/instrument-bindings.js`: 데이터와 DOM·SVG 바인딩
- `js/instrument-config.js`: 카메라 깊이, 스크롤 길이, scrub, 카메라 waypoint
- `js/instrument-world.js`: Canvas 렌더러와 하나의 GSAP master timeline
- `assets/datahub-dashboard.png`: 마지막에 도킹되는 실제 DataHub 화면 캡처
- `vendor/`: 로컬 GSAP 및 ScrollTrigger
- `tests/instrument-contract.mjs`: 구조·콘텐츠 계약 테스트

## 진행률

| 구간 | 경험 |
|---:|---|
| 0–16% | 각자의 깊이와 방향에서 움직이는 업무 데이터 |
| 16–34% | 식별자·시간·관계 기준을 맞추는 Calibration Gate |
| 34–55% | 9개 데이터가 하나의 Connected Schema로 정렬 |
| 55–68% | 판매 순위·주문 추이·공급률·판매출고 지표로 변환 |
| 68–76% | 근거 데이터 옆에만 Kimi 분석 메모 표시 |
| 76–91% | 기존 오브젝트가 Dashboard 좌표로 수렴 |
| 91–100% | 실제 DataHub 화면 캡처로 resolve 및 CTA 표시 |

## 데이터와 문구 수정

`js/instrument-data.js`의 `INSTRUMENT_CONTENT`만 수정합니다.

- `records`: 상품·주문·매출·재고·회원·출판사·저자·책방·지역
- `metrics`, `trend`, `reports`: 분석 지표와 차트
- `kimi`: Kimi 근거 메모
- `dashboard.metrics`: resolve 직전 DOM Dashboard 수치
- `dashboard.dataHubUrl`: 마지막 버튼이 이동할 실제 DataHub URL

9개 `records`의 개수와 순서는 같은 DOM identity를 끝까지 유지하므로 가급적 보존하세요.

## 모션 조정

`js/instrument-config.js`:

- `cameraDepth`: 전체 전진 거리
- `scrollViewports`, `minimumScrollPixels`: 전체 스크롤 길이
- `compactScrollViewports`, `compactMinimumScrollPixels`: 작은 화면의 축소된 스크롤 길이
- `scrubSeconds`: 스크롤 추종 완충 시간
- `CAMERA`: 진행률별 x/y/yaw/pitch/roll
- `START_POSES`: 업무 데이터의 최초 위치와 깊이

구간별 오브젝트 좌표와 시간은 `js/instrument-world.js`의 `createTimeline()`에서 0–100 절대 진행률로 관리합니다. ScrollTrigger는 master timeline에 하나만 존재합니다.

## 실제 DataHub 화면 교체

같은 파일명으로 `assets/datahub-dashboard.png`를 교체하는 것이 가장 간단합니다. 현재 기준 비율은 1918×968입니다. 다른 비율을 사용하면 `css/instrument.css`의 `.dashboard-plane` `aspect-ratio`도 함께 변경하세요.

실제 서비스 주소로 이동하려면 `js/instrument-data.js`에서 다음 값을 지정합니다.

```js
dashboard: {
  dataHubUrl: 'https://실제-datahub-주소'
}
```

캡처 이미지 안의 숫자는 정적입니다. 최종 화면까지 실시간 수치를 유지하려면 `instrument-world.js`의 91% 이후 `.dashboardCapture` reveal을 제거하고, 바인딩된 `.dashboard-blueprint`를 유지하면 됩니다.

## 검증

```powershell
npm test
```

테스트는 업무 데이터 9개, 단일 ScrollTrigger, 하나의 master clock, Kimi 노출 구간, Dashboard 도킹, reduced-motion, 금지 문구를 확인합니다.
