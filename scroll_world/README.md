# AX Scroll World

스크롤을 내리면 카메라가 **하나의 긴 3D 공간**을 여행하는 몰입형 웹 경험입니다.
Apple Vision Pro 페이지, GitHub Scroll World 스타일의 스크롤텔링을 **무료 오픈소스만으로** 구현했습니다.

- 섹션 점프 없음 — 카메라가 CatmullRom 스플라인 경로를 따라 연속 이동
- AI 생성 영상/이미지 없음 — 모든 비주얼은 Three.js 지오메트리 + 캔버스 텍스처로 절차 생성
- 프레임워크 없음 — HTML + CSS + Vanilla JS (ES Modules)

## 여정 구성

| 구간 | 씬 | 내용 | 월드 z 좌표 |
|---|---|---|---|
| 0 ~ 20% | **Universe** | 별 필드 · 성운 · 우주 먼지 · 은은한 회전 | `z ≈ 60 → -40` |
| 20 ~ 40% | **AX DataHub** | 서버 타워 · 데이터 큐브 · 발광 라인 · 데이터 흐름 파티클 | `z ≈ -100` |
| 40 ~ 60% | **LLM Core** | 거대 AI 코어 + Prompt/Vector/SQL/API/Docs 공전 | `z ≈ -180` |
| 60 ~ 80% | **Automation Factory** | 컨베이어 · 로봇 팔 · 기어 · 워크플로 노드 | `z ≈ -260` |
| 80 ~ 100% | **Workspace** | 가장 밝은 공간 · 떠 있는 대시보드 · "Welcome to AX Workspace" | `z ≈ -340` |

스크롤 진행도(0~1) 하나가 카메라 위치/회전, 포그 색·밀도, 조명 세기·색, 블룸 강도, 캡션 페이드를 모두 구동합니다.

## 실행 방법

ES Module + CDN import map을 사용하므로 **로컬 서버로 실행해야 합니다** (`file://`로 열면 동작하지 않음).

```bash
# 방법 1: Node.js
npx serve .

# 방법 2: Python
python -m http.server 8080
```

이후 브라우저에서 `http://localhost:포트/scroll_world/` (레포 루트에서 실행 시) 또는
`http://localhost:포트/` (이 폴더에서 실행 시)로 접속합니다.
VSCode **Live Server** 확장으로 `index.html`을 열어도 됩니다.

> 인터넷 연결 필요: Three.js / GSAP을 jsDelivr CDN에서 로드합니다.

## 기술 스택

| 라이브러리 | 버전 | 용도 | 라이선스 |
|---|---|---|---|
| [Three.js](https://threejs.org) | 0.160.0 | 3D 렌더링, 포스트프로세싱(UnrealBloomPass) | MIT |
| [GSAP](https://gsap.com) + ScrollTrigger | 3.12.5 | 스크롤 스크럽, 캡션 타임라인 | 무료 (Standard License) |

## 코드 구조

```
scroll_world/
├── index.html          # 마크업 + import map + 오버레이(캡션/진행바/힌트)
├── styles/
│   └── main.css        # 고정 캔버스, 스크롤 공간(700vh), 오버레이 스타일
├── src/
│   ├── main.js         # 엔트리 — 렌더러/컴포저 조립, 렌더 루프, 리사이즈
│   ├── scene.js        # 5개 존 월드 구축 (지오메트리·캔버스 텍스처 절차 생성)
│   ├── camera.js       # 카메라 + 이동/시선 CatmullRom 스플라인 경로
│   ├── lights.js       # 전역 조명 + 존별 포인트 라이트
│   ├── particles.js    # 별/성운/먼지/데이터 흐름 파티클
│   ├── animation.js    # 상시(idle) 애니메이션 — 공전, 컨베이어, 기어 등
│   └── scroll.js       # ScrollTrigger 연동 — 환경 키프레임 보간, 캡션 페이드
├── assets/             # 외부 에셋 없음 (모두 절차 생성) — 설명 참고
└── README.md
```

### 동작 원리 (한 장 요약)

```
스크롤  ──▶  GSAP ScrollTrigger (scrub: 0.9)
                 │
                 ▼
          scrollState.progress (0~1)
                 │
   ┌─────────────┼──────────────────┐
   ▼             ▼                  ▼
카메라 스플라인   환경 키프레임 보간     캡션 타임라인
(camera.js)     (scroll.js)         (scroll.js)
position/lookAt  포그·조명·블룸        autoAlpha 페이드
```

렌더 루프(main.js)는 매 프레임 `scrollState.progress`를 읽어 카메라를 스플라인 위에 배치하고,
`animation.js`가 스크롤과 무관한 상시 애니메이션(코어 맥동, 컨베이어, 기어 회전 등)을 돌립니다.

## 커스터마이징 가이드

| 하고 싶은 것 | 수정 위치 |
|---|---|
| 여정 길이(스크롤 양) 조절 | `main.css`의 `#scroll-space { height: 700vh }` |
| 카메라 동선 변경 | `camera.js`의 `POSITION_WAYPOINTS` / `LOOKAT_WAYPOINTS` |
| 씬 분위기(포그·조명·블룸) | `scroll.js`의 `ENV_KEYFRAMES` |
| 캡션 등장 타이밍 | `scroll.js` 하단 타임라인 position 값 (0~1) |
| 존 위치 이동 | `scene.js`의 `ZONE` 상수 (카메라 웨이포인트도 함께 조정) |
| 오브젝트 밀도 | `scene.js` 각 빌더의 count 값들 |

## 최적화 적용 내역

- **DPR 상한**: 데스크톱 2.0 / 모바일 1.5 — 고해상도 기기 픽셀 폭증 방지
- **모바일 등급 분기**: 파티클·타워·큐브 수 축소, Bloom/안티앨리어싱 비활성화
- **지오메트리 최소화**: 저폴리 프리미티브(Icosahedron detail 1, 세그먼트 최소값) 사용
- **텍스처**: 외부 이미지 0개 — 소형 캔버스 텍스처(64~512px)만 사용, 소프트 서클 텍스처 공유
- **GC 방지**: 렌더 루프에서 벡터/컬러 객체 재사용, 파티클은 단일 BufferGeometry 갱신
- **포그 = 자연 LOD**: 먼 존은 포그에 묻혀 오버드로 부담이 낮음 (전 존이 상주해도 프래그먼트 비용 제한적)
- **탭 복귀 보호**: delta time 상한(0.05s)으로 애니메이션 점프 방지

## 참고

- 브라우저 지원: ES Modules + import map 지원 브라우저 (Chrome/Edge/Safari/Firefox 최신)
- WebGL 미지원 환경에서는 안내 문구를 표시합니다.
