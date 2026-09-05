# 태그 모니터링 — 구현 사양서

POC(`index.html`)를 실제 화면으로 옮기기 위한 사양서. **UI·정책은 확정 상태**이며, 남은 일은 정적 데이터를 실제 조회로 바꾸는 배선뿐이다.

## 0. 먼저 알아야 할 것

- 스케줄 행은 이미 DB에 있으나(`api/reports/tag-monitoring-weekly`, 매주 월 14:00, EXCEL) **엔드포인트 구현이 없다.** `ReportScheduleController.cs`의 지원 엔드포인트 화이트리스트 배열에 문자열을 추가해야 동작한다.
- POC는 DB 연결이 없다. 모든 수치는 `assets/js/data.js`(2026-08-24~08-30 실제 추출본)에서 온다.

## 1. 파일 대응

| POC | 이식 위치 |
|---|---|
| `_content.html` (= `index.html`의 `#poc-slot` 내용) | `Views/TagMonitoring/Index.cshtml` |
| `assets/css/page.css` | `wwwroot/css/pages/TagMonitoring.Index.css` |
| `assets/js/app.js` | `wwwroot/js/TagMonitoring/Index.js` |
| `assets/js/data.js` | **삭제.** 서버 조회로 대체 |
| `harness.html`, `build.js` | 이식하지 않음 (POC 미리보기 전용) |

폰트는 이식 대상이 아니다. 운영에는 이미 있다.

## 2. 재사용 — 새로 만들지 말 것

전부 기존 자산이며 POC에서 그대로 썼다.

- 레이아웃·컴포넌트: `app-layout` / `sidebar` / `top-header` / `page-header` / `page-title` / `card` / `card-header` / `card-content` / `card-footer` / `stat-card` / `grid grid-cols-N` / `tabs` / `tab-btn` / `table-wrapper` / `data-table` / `badge-*` / `banner--*` / `tag` / `tag-list` / `empty-state` / `form-select` / `btn btn-outline btn-sm`
- 차트: **Chart.js 4.4.4** (`https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js`) + `~/js/chart-helpers.js`
  - POC의 `colors()` / `pal()` 은 `AxChart.colors()` / `AxChart.color(i)` 로 교체할 것. 동작·반환 형태를 맞춰 두었다.
  - 다크모드는 `ax:theme-change` 이벤트에서 destroy 후 재생성 (POC의 `rebuild()`)
- 토스트: `window.showToast(message, isError)`
- 업로드: `WeeklyReport/Upload` 패턴을 따랐다. **preview → commit 2단계**를 유지할 것
- `page.css`에 새로 정의한 것은 `.tm-*` 접두사뿐이다.

## 3. 화면 구성

**탭 1 · 주간 리포트** — KPI 4장 → 퍼널 산점도 + 요일별 순위 변동 → 관리분류별 연결상품 클릭 → 태그/연결상품 클릭 순위 2단 → 연결상품 상위 도서 → 일간 클릭 BEST 매트릭스 → 신규 생성 태그

**탭 2 · 태그 작업 큐** — 첨부 드롭존 → 커버리지 도넛 2개 + 관리분류별 미태깅 → 태그 작업 목록(필터: 전체/미태깅만, 출처)

발송·실행·이력은 **리포트 스케줄 관리 메뉴에 위임**한다. 이 화면에 만들지 않는다. 헤더의 `스케줄 관리 ↗` 링크만 실제 URL로 연결할 것.

## 4. 데이터 계약

응답 봉투는 기존 규약을 따른다 — 단건 `{ success, data, message }`, 목록 `{ items, totalCount, page, pageSize, totalPages }`.

`GET /TagMonitoring/Report?weekStart=2026-08-24` → `data` 는 `assets/js/data.js`의 `window.TM_DATA` 와 **동일한 형태**로 반환한다. POC의 렌더링 코드를 그대로 쓰기 위함이다.

```
period      string                                                  "2026-08-24 ~ 2026-08-30"
newTags     [{ no, name, user, date, linked:int }]                  태그관리 신규생성 (등록일 오름차순 아님, 최신순)
dailyDates  [string x7]                                             "08-24 (월)" … "08-30 (일)"
daily       [{ rank:int, tags:[string x7] }] x10                    rank 1..10, tags 는 요일 순
tagClicks   [{ rank, name, clicks:int }] x20                        태그 클릭 순위
prodClicks  [{ rank, name, clicks:int }] x20                        태그 → 연결상품 클릭 순위
prodDetail  [{ rank, tag, pid, title, cat, clicks:int }] x20        연결상품 상세
mainUpdate  [{ cat, pid, title, tags:[string], miss:bool }]         첨부 업로드분. 태그 최대 6개
best100     [{ cat, pid, title, tags:[string], miss:bool }] x100    종합베스트. 태그 최대 8개
```

`tags` 는 **빈 문자열을 제거한 배열**이다 (엑셀의 태그1~6/1~8 컬럼과 다름). 화면은 개수를 세지 않고 배열 길이만 쓴다.

`pid` 는 문자열로 보낼 것. 숫자로 보내면 자릿수 표시가 깨진다.

### 첨부 업로드

기존 `WeeklyReport/Upload` 와 동일하게 2단계.

```
POST /TagMonitoring/Preview   FormData(file)   → { success, data:{ fileName, items:[{cat,pid,title}] }, message }
POST /TagMonitoring/Commit    { weekStart, items }  → { success, message }
```

제약도 동일하다 — `.xlsx` 전용, 최대 60MB, 그 외 확장자는 `showToast(msg, true)` 로 거절.

## 5. 엣지 케이스 — 반드시 지킬 것

1. **`miss` 판정.** 태그가 하나도 없거나, **청년패스(태그번호 9203)만** 달린 상품은 `miss = true`. 청년패스는 전사 프로모션 태그라 자동 부여되므로 태깅 작업 실적으로 치지 않는다. 원본 엑셀의 주황 하이라이트(`FCE4D6`)와 같은 규칙이며, 화면에서는 `tr.tm-miss` 로 표현된다.
2. 청년패스 태그 칩은 `.tm-tag-auto` 를 붙여 흐리게 표시한다.
3. **산점도는 두 순위표에 모두 든 태그만** 좌표가 나온다(현 데이터 기준 9개). 한쪽에만 있는 태그를 0이나 추정값으로 채우지 말 것. 표본 수는 카드 설명에 자동 표기된다.
4. **범프 차트는 10위 안에 3일 이상 머문 태그만**, 최대 8개. 전부 그리면 읽을 수 없다.
5. 신규 태그 중 `linked === 0` 은 "연결 0건" 경고 배지. 만들다 만 태그라 보고 대상이다.
6. 첨부 미등록 상태에서는 메인 업데이트 커버리지를 `0%` 가 아니라 **`—` (첨부 대기 중)** 로 표시한다. 0%로 쓰면 "전부 미태깅"으로 오독된다.
7. 탭 전환 시 `chart.resize()` 를 호출한다. 숨겨진 동안 생성된 차트는 캔버스가 0×0이다.

## 6. 스케줄 연동

`api/reports/tag-monitoring-weekly` 를 지원 엔드포인트에 추가하고, **첨부(mainUpdate)가 없으면 실패를 반환**하도록 한다. 그러면 리포트 스케줄 관리의 `최근 실행`에 FAIL로 남고 이력에도 잡히므로, 별도 알림 체계가 필요 없다.

4번 항목만 빼고 발송하지 말 것. 그 섹션이 메일의 목적이다.

> 참고 — cron이 월 14:00인데 첨부 메일은 그날 아침에 온다. 업로드 창이 몇 시간뿐이라 화요일로 미루거나 첨부 등록 시점에 실행하는 편이 안전하다. **운영 판단 사항.**

## 7. 완료 판정

- [ ] 두 탭이 실데이터로 렌더되고 콘솔 에러가 없다
- [ ] 다크모드 토글 시 6개 차트가 모두 테마 색으로 다시 그려진다
- [ ] `.xlsx` 업로드 → 미리보기 → 등록 후 메인 업데이트 행이 목록에 붙는다
- [ ] 청년패스만 달린 상품이 미태깅으로 잡힌다
- [ ] 스케줄에서 `실행` 시 엑셀이 생성되고, 첨부가 없으면 FAIL로 남는다

## 8. 미해결

- 이 화면을 **datahub.Web / Labs.Web 중 어디에** 둘지 미정. POC는 datahub harness CSS 기준으로 만들었으나, 스케줄러와 업로드 참조 코드는 Labs.Web에 있다. Labs로 갈 경우 `nt-badge` 등 일부 클래스가 없으므로 대조가 필요하다.
- 트리맵은 넣지 않았다. Chart.js 기본에 없어 플러그인이 필요한데, 가로 막대로 충분하다고 판단했다.
