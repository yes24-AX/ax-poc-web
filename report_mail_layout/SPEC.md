# 리포트 발송 메일 레이아웃 관리 — 구현 명세

> 이 문서는 `ax-poc-web/report_mail_layout` POC의 명세이자, **다른 코딩 에이전트/개발자가
> `ax-labs-platform`에 실제 구현할 때 참조하는 문서**다.
> POC는 정적 HTML/CSS/JS이며 데이터는 전부 목업이다. 빌드 불필요 — `index.html`을 브라우저로 열면 된다.

- 실행: `report_mail_layout/index.html` (또는 정적 서버로 `http://localhost:8940/report_mail_layout/`)
- 대상 시스템: `ax-labs-platform` (ASP.NET Core MVC + Razor + vanilla JS, PostgreSQL, Dapper, Hangfire)
- 기준 화면: `ax-labs.yes24.com` → 어드민 도구 → **리포트 스케줄 관리**

---

## 1. 배경 — 지금 무엇이 문제인가

리포트 스케줄 관리 화면은 `report.report_schedule`을 CRUD하고, Hangfire `ReportDispatchJob`이
cron에 맞춰 `api/reports/*` 웹훅을 호출해 메일을 보낸다. 미리보기(`ReportScheduleController.Preview`)는
엔드포인트별 분기로 각 서비스의 `PreviewAsync`를 호출해 받은 HTML을 `<iframe srcdoc>`에 그대로 꽂는다.

문제는 **메일 HTML을 21개 Application 서비스가 각자 `StringBuilder`로 인라인 스타일 하드코딩**한다는 점이다.

| 현상 | 근거 |
|---|---|
| 공통 레이아웃 계층이 없다 | `EmailLayout` / `MailTemplate` / `HtmlShell` 류 클래스가 코드베이스에 없음 |
| 헤더·요약박스·푸터 마크업이 서비스마다 복붙 | `AiBookDetectReportService`, `AladinNewBookReportService`, `AccessReportV2Service` … 전부 `border-collapse` + `#f4f6f9` thead를 각자 작성 |
| 강조색이 표류 | `#d6304a`(빨강) `#b26a00`(주황) `#6b7280`(회색) `#2563eb`(파랑)를 서비스별로 임의 사용 |
| 제목이 코드에 박혀 있다 | `$"[업무] {based.Month}월 {based.Day}일 AI 추정 전자책 리스트"` 처럼 문자열 리터럴 |
| 발송본이 보존되지 않는다 | `report_schedule_run`은 상태·크기·에러만 기록. "지난주 실제로 나간 메일"을 볼 방법이 없음 |

→ **안내 문구 한 줄 바꾸려면 개발자가 코드를 고치고 배포해야 한다.** 이 기능이 해결할 지점이다.

## 2. 결정 사항 (요청자 확인 완료)

| 항목 | 결정 | 이유 |
|---|---|---|
| 편집 범위 | **레이아웃(껍데기)만** — ① 제목·발신자 ② 헤더·푸터 ③ 본문 앞뒤 문구 블록 | 본문 표는 리포트별 데이터 구조가 제각각이라 손대면 21개 서비스를 다 고쳐야 함 |
| 본문 표 스타일 토큰화 | **제외** | 각 서비스의 하드코딩된 인라인 스타일을 토큰 참조로 바꾸는 이행 비용이 큼. 필요해지면 2차로 |
| 소유 단위 | **공용 레이아웃 + 메일별 키 단위 오버라이드** | 24건을 일일이 꾸미지 않아도 되고, 공통 변경은 한 번에 반영 |
| 미리보기 데이터 | **실데이터 dry-run + 발송본 스냅샷 보존** | 현재도 dry-run은 되지만 "실제로 나간 것"과 대조가 불가능 |
| 화면 | **3뷰** — 발송 메일 목록 / 레이아웃 편집기 / 레이아웃 라이브러리 | |

---

## 3. 화면 구성

### 3.1 발송 메일 목록 (`#view-list`)

기존 리포트 스케줄 관리 표에 **레이아웃 컬럼**을 추가한 형태.

```
ID | 작업명 | Cron | 포맷 | 활성 | 엔드포인트 | 레이아웃 | 최근 실행 | 관리
```

- 레이아웃 셀: 공용 레이아웃 배지 + 오버라이드가 있으면 `개별 N` pill
- 관리: `[레이아웃]`(편집기 진입) `[미리보기]`(발송본 우선)
- 필터: 검색어(작업명·엔드포인트) / `전체·활성만·개별 수정만` / 레이아웃별 칩
- 상단 스탯: 전체 메일 · 활성 · 공용 레이아웃 종류 · 개별 오버라이드 수

> 실행·수정·삭제·cron 편집·수신자 관리는 **기존 화면 기능**이라 재구현하지 않는다.

### 3.2 레이아웃 편집기 (`#view-editor`) — 핵심 화면

좌(편집) / 우(실시간 미리보기) 2단. `1080px` 이하에서 세로로 접힘.

**좌 — 아코디언 5섹션.** 각 필드마다 `[공용 값 ↔ 이 메일 전용]` 토글이 붙는다.
오버라이드로 전환하면 **현재 공용값을 복사해 넣어** 값이 튀지 않는다.

| # | 섹션 | 필드 |
|---|---|---|
| 1 | 제목 · 발신자 | `subjectTpl`, `fromName`, `fromAddress` |
| 2 | 헤더 | `headerTitleTpl`, `headerSubtitleTpl`, `headerLogo`(on/off), `headerAccent`(5색 스와치) |
| 3 | 본문 앞 문구 블록 | `introBlocks[]` — 추가/순서변경/삭제/인라인 편집 |
| 4 | 본문 뒤 문구 블록 | `outroBlocks[]` — 동일 |
| 5 | 푸터 | `footerTextTpl`, `footerContact`, `footerUnsub`(on/off) |

- 상단에 **치환 변수 칩**. 입력란 포커스 후 칩을 누르면 커서 위치에 `{{var}}` 삽입
  (칩은 `mousedown`에서 `preventDefault()` 하므로 포커스가 유지된다).
- 변수를 포함한 필드 아래에는 **치환 결과 한 줄**을 보여준다(변수가 없으면 숨김).
- 하단 액션: `저장` / `공용 값으로 초기화` / `테스트 발송`, 좌측에 변경 상태 표시.

**우 — 미리보기**
- 본문 데이터 소스 세그먼트: `샘플 본문` / `실데이터 미리보기` / `발송본`(+스냅샷 드롭다운)
- 뷰포트: `데스크톱` / `모바일(375px)`
- 메일함처럼 **제목 바**(제목·발신자·수신자·발송시각)를 먼저 보여주고 그 아래 `<iframe srcdoc>` 본문
- `[공용과 비교]` — 좌우 2프레임 + 덮어쓴 항목 칩 목록
- `[새 탭에서 열기]`(Blob URL) / `[HTML 소스 보기]`(복사 가능)
- iframe은 same-origin이라 로드 후 `scrollHeight`를 재서 **높이를 자동으로 맞춘다**(내부 스크롤 방지, 최대 1500px)

**발송본 모드의 규칙**: 발송본은 그때의 레이아웃으로 **얼어 있고 편집 내용이 반영되지 않는다.**
이것이 "미리보기 = 앞으로 나갈 메일 / 발송본 = 실제로 나간 메일"을 구분해 주는 지점이다.

### 3.3 레이아웃 라이브러리 (`#view-library`)

- 카드 3종 + `새 레이아웃 만들기`. 카드에는 **미니 프리뷰**(iframe을 400% 크기로 그리고 `scale(0.25)`)와
  `사용 중 N개` / `개별 수정 N개` 표시
- 하단에 **레이아웃별 사용 현황 표** — 어떤 메일이 무엇을 덮어썼는지 한눈에

---

## 4. 데이터 모델

기존 마이그레이션 관례를 따라 `database/migrations/AX_LABS/NNN_*.sql`에 멱등 스크립트로 추가한다.

### 4.1 신규 — `report.report_mail_layout`

```sql
CREATE TABLE IF NOT EXISTS report.report_mail_layout (
  id                  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  layout_name         VARCHAR(100) NOT NULL,
  description         VARCHAR(300) NULL,
  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  subject_tpl         VARCHAR(300) NOT NULL,
  from_name           VARCHAR(100) NULL,   -- NULL이면 ReportMail:FromName 설정값
  from_address        VARCHAR(200) NULL,   -- NULL이면 ReportMail:FromAddress
  header_title_tpl    VARCHAR(200) NULL,
  header_subtitle_tpl VARCHAR(300) NULL,
  header_logo_yn      CHAR(1)      NOT NULL DEFAULT 'Y',
  header_accent       VARCHAR(20)  NULL,   -- slate | blue | red | amber | violet
  intro_blocks        JSONB        NULL,
  outro_blocks        JSONB        NULL,
  footer_text_tpl     VARCHAR(500) NULL,
  footer_contact      VARCHAR(200) NULL,
  footer_unsub_yn     CHAR(1)      NOT NULL DEFAULT 'N',
  delete_yn           CHAR(1)      NOT NULL DEFAULT 'N',
  created_by VARCHAR(50), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50), updated_at TIMESTAMPTZ
);
-- is_default 는 1건만
CREATE UNIQUE INDEX IF NOT EXISTS ux_report_mail_layout_default
  ON report.report_mail_layout ((1)) WHERE is_default AND delete_yn = 'N';
```

**블록 JSON 스키마** (intro/outro 공통):

```jsonc
[
  { "type": "text",    "text": "안녕하세요. {{period}} 집계 결과를 공유드립니다." },
  { "type": "callout", "tone": "info|warn|danger", "text": "확인 후 처리해 주세요." },
  { "type": "cta",     "label": "AX-Labs에서 보기", "url": "{{siteUrl}}" }
]
```

### 4.2 확장 — `report.report_schedule`

```sql
ALTER TABLE report.report_schedule
  ADD COLUMN IF NOT EXISTS layout_id       INT   NULL REFERENCES report.report_mail_layout(id),
  ADD COLUMN IF NOT EXISTS layout_override JSONB NULL;
```

- `layout_override`는 `report_mail_layout`과 **동일한 키**를 쓰고, 덮어쓸 항목만 담는다.
- 해석: `키가 override에 있으면 그 값, 없으면 layout 값, 그것도 NULL이면 시스템 기본값`
- `layout_id IS NULL` → `is_default = TRUE` 레이아웃 사용
- **키 단위**이므로 공용 문구를 고치면 해당 키를 덮어쓰지 않은 메일에는 즉시 반영된다.

### 4.3 신규 — `report.report_schedule_run_artifact` (발송본 스냅샷)

```sql
CREATE TABLE IF NOT EXISTS report.report_schedule_run_artifact (
  run_id           INT PRIMARY KEY REFERENCES report.report_schedule_run(id),
  rendered_subject VARCHAR(500) NULL,
  rendered_html    TEXT         NULL,
  layout_id        INT          NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

`report_schedule_run` 본체가 아니라 **별도 테이블**인 이유: 이력 목록 쿼리
(`Data/Sql/ReportScheduleRun/List.sql`)가 `SELECT *`라서 TEXT 컬럼을 매번 끌고 오게 된다.
보존 기간(예: 90일) 정리 잡을 함께 둔다.

### 4.4 엔티티 / 데이터 접근

기존 관례 그대로:
- 엔티티: `src/Labs.DataContracts/ReportSchedule/ReportMailLayoutEntities.cs`
  — 속성명은 `Layout_Name`, `Subject_Tpl` 같은 **Pascal_Snake**로 두면 Dapper가 snake_case 컬럼에 자동 매핑
- SQL: `src/Labs.Infrastructure/Data/Sql/ReportMailLayout/{List,Get,Insert,Update,Delete}.sql`
- 리포지토리: `src/Labs.Infrastructure/Repositories/ReportMailLayoutRepository.cs`
- 서비스: `src/Labs.Application/{Interfaces/IReportMailLayoutService.cs, Services/ReportMailLayoutService.cs}`

---

## 5. 합성기 `IReportMailComposer` — 가장 중요한 이행 포인트

POC의 `assets/js/app.js` `composeMail()`이 이 인터페이스의 **동작 명세**다. 서버 구현은 이와 1:1로 맞춘다.

```csharp
public sealed record ComposedMail(string Subject, string Html, string? FromName, string? FromAddress);

public interface IReportMailComposer
{
    ComposedMail Compose(
        ReportMailLayout layout,
        JsonDocument? overrides,
        IReadOnlyDictionary<string, string> vars,
        string bodyHtml);
}
```

### 5.1 합성 순서

```
헤더  →  intro_blocks  →  bodyHtml(리포트 서비스 산출물, 그대로)  →  outro_blocks  →  푸터
```

- `bodyHtml`은 **각 서비스의 기존 `BuildHtml` 결과를 손대지 않고** 그대로 삽입한다.
  서비스 코드를 고칠 필요가 없다는 것이 이 설계의 핵심이다.
- 전체를 인라인 스타일 `<table>`로 감싼다 (메일 클라이언트 호환). CSS 변수·`<style>`·외부 CSS 금지.
- 바깥 캔버스 `#f0f2f5`, 카드 `#ffffff` + `1px solid #e2e6ec` + `border-radius:8px`, 최대 폭 `840px`.
- 헤더 상단에 `border-top: 4px solid {accent}`.

### 5.2 변수 치환

```
{{jobName}} {{baseDate}} {{yyyy}} {{MM}} {{dd}} {{M}} {{D}}
{{period}}  {{rowCount}} {{sentAt}}  {{siteUrl}}
```

- `{{yyyy}}`/`{{MM}}`/`{{dd}}`/`{{M}}`/`{{D}}`는 `baseDate`에서 파생
- **정의되지 않은 변수는 원문(`{{nope}}`)을 그대로 남긴다.** 빈 문자열로 지우면 치환 실패를
  아무도 눈치채지 못한다 — 미리보기에서 바로 보이게 하는 것이 목적
- 치환 대상: `subject_tpl`, `header_*_tpl`, `footer_text_tpl`, `footer_contact`, 블록의 `text`/`label`/`url`

### 5.3 보안

| 항목 | 규칙 |
|---|---|
| 사용자 입력 문구 | **치환 후 `WebUtility.HtmlEncode`.** 블록은 서식이 아니라 문구이므로 HTML을 허용하지 않는다 |
| `cta.url` | 치환 후 `https://` 로 시작하지 않으면 링크를 `#`으로 대체 (`javascript:` 차단) |
| `bodyHtml` | 내부 서비스가 만든 신뢰 가능한 HTML이므로 그대로 삽입 |
| 편집 권한 | 기존 리포트 스케줄 메뉴와 동일하게 `__ADMIN_ONLY__` |

### 5.4 호출 지점 (두 곳이 같은 `Compose`를 타야 한다)

1. **발송** — 각 리포트 서비스가 `_email.SendAsync()`를 호출하기 직전, 지금 subject/html을 만드는 자리
2. **미리보기** — `ReportScheduleController.Preview`의 응답 조립 지점

이 둘이 같은 함수를 거쳐야 "미리보기 = 실제 발송본"이 성립한다.
합성기를 아직 붙이지 않은 서비스는 **지금과 완전히 동일하게 동작**하므로 21개를 한 번에 고칠 필요가 없다.

---

## 6. API 사양 (제안)

기존 `ReportScheduleController` 관례(POST + JSON, `data-*`로 URL 주입)를 따른다.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET  | `/ReportMailLayout/List` | 공용 레이아웃 목록 + 사용 메일 수 |
| GET  | `/ReportMailLayout/Get?id=` | 단건 |
| POST | `/ReportMailLayout/Save` | 생성·수정 (`is_default` 지정 포함) |
| POST | `/ReportMailLayout/Delete` | 논리 삭제 (사용 중이면 거부) |
| GET  | `/ReportSchedule/LayoutOf?id=` | 스케줄의 `layout_id` + `layout_override` |
| POST | `/ReportSchedule/SaveLayout` | `{ scheduleId, layoutId, override }` 저장 |
| POST | `/ReportSchedule/Preview` | **기존 API에 `layoutId`/`override`를 옵션으로 추가** — 저장 전 미리보기 |
| GET  | `/ReportSchedule/RunArtifact?runId=` | 발송본 스냅샷(`rendered_subject`/`rendered_html`) |
| POST | `/ReportSchedule/SendTest` | 본인 계정으로만 테스트 발송 |

`Preview` 응답은 기존 형태(`{ success, html, title, generatedAt, warning }`)를 유지하되
`subject`, `fromName`, `fromAddress`를 추가한다 — 현재는 제목이 응답에 없어 미리보기에서 확인이 안 된다.

---

## 7. 이행 계획

| 단계 | 내용 | 리스크 |
|---|---|---|
| 1 | 테이블 3종 + 엔티티·리포지토리·서비스 추가, 기본 레이아웃 3종 시드 | 낮음 (기존 동작 무영향) |
| 2 | `IReportMailComposer` 구현 + 단위 테스트(치환·이스케이프·URL 화이트리스트) | 낮음 |
| 3 | 관리 화면(3뷰) 추가 — `Views/ReportMailLayout/Index.cshtml` + `wwwroot/js/ReportMailLayout/Index.js` | 낮음 |
| 4 | `Preview`에 합성기 연결 (`layoutId`/`override` 파라미터) | 중간 — 기존 미리보기 회귀 확인 필요 |
| 5 | **리포트 1건**(예: `ai-book-detect`)만 발송 경로에 합성기 적용 후 실사용 검증 | 중간 |
| 6 | 나머지 서비스로 점진 확대. `BuildHtml`이 껍데기를 만들던 부분을 걷어내고 본문만 반환하게 정리 | 서비스별로 확인 필요 |
| 7 | 발송 시 `rendered_html` 스냅샷 저장 + 90일 정리 잡 | 낮음 (용량만 주의) |

**6단계 주의**: 현재 서비스들은 본문 안에 이미 자체 헤더(`<h2>`)와 안내 푸터를 갖고 있다
(예: `AiBookDetectReportService`의 마지막 `<div>` 안내 박스). 합성기를 붙이면서 그 부분을
레이아웃 블록으로 옮겨야 중복이 생기지 않는다. POC의 스케줄 24번 `outroBlocks`가 그 예시다
— 실제 서비스 코드에 있던 안내 문구를 그대로 콜아웃 블록으로 옮겨 담았다.

---

## 8. 연동 필요 데이터

| 데이터 | 출처 | POC에서의 대체 |
|---|---|---|
| 발송 메일 목록 | `report.report_schedule` (기존) | `data.js`의 `SCHEDULES` 24건 (실제 화면 캡처 기준) |
| 공용 레이아웃 | `report.report_mail_layout` (신규) | `LAYOUTS` 3종 |
| 메일별 오버라이드 | `report_schedule.layout_override` (신규) | `SCHEDULES[].override` |
| 본문 HTML | `POST api/reports/*` dry-run (`EmailTo = null`) | `SAMPLE_BODIES` — 실제 서비스 출력 마크업을 본떠 작성 |
| 발송본 스냅샷 | `report_schedule_run_artifact` (신규) | `RUN_SNAPSHOTS` — 과거 레이아웃 patch를 얹어 합성 |
| 수신자 수 | `report_schedule_recipient` + `email_to` (기존) | 스냅샷의 `recipients` 고정값 |
| 발신자 기본값 | `appsettings.json` `ReportMail:*`, `InternalApi:Mail:*` | 레이아웃의 `fromName`/`fromAddress` |

---

## 9. 구현 메모

- **색상 규칙**: 앱 화면(셸·폼·표)은 `ax-labs-platform` 디자인 토큰(`var(--primary)` 등)만 쓴다.
  단 **메일 본문/미리보기 HTML 문자열 안의 hex는 의도적 예외** — 메일 클라이언트는 CSS 변수를
  지원하지 않는다. `style.css`의 POC 영역에 남은 hex는 미리보기 캔버스 배경 `#ffffff` 3곳뿐이며,
  이는 다크모드에서도 메일 종이면이 흰색이어야 하기 때문이다.
- **다크모드**: 셸과 편집 폼은 따라 바뀌고, 미리보기 iframe 안쪽은 라이트 고정이다(의도된 동작).
  미리보기 하단에 그 사실을 캡션으로 안내한다.
- **그리드 블로우아웃**: 축소 프리뷰 iframe(400% 크기)이 그리드 폭을 밀어내지 않도록
  `.grid > * { min-width: 0 }`이 필요하다. 없으면 페이지가 가로로 3000px 넘게 늘어난다.
- **폼 재렌더와 포커스**: 텍스트 입력은 `input` 이벤트에서 미리보기만 갱신하고 폼은 다시 그리지 않는다
  (커서 유지). 블록 추가·삭제·순서변경·토글처럼 구조가 바뀔 때만 `renderForm()`을 호출한다.
- **변수 칩 대상 추적**: 폼이 통째로 다시 그려지므로 개별 노드에 `focus`를 걸지 말고
  컨테이너에 `focusin`(버블링됨)을 위임한다. 삽입 대상은 `document.activeElement`를 우선 사용한다.

---

## 10. 범위 밖 / 향후 과제

- 본문 표 스타일 토큰화 (요청자 결정으로 제외)
- 레이아웃 **버전 관리·롤백** — 누가 언제 무엇을 바꿨는지 이력. 2차 과제로 권장
- A/B 발송, 수신자 그룹별 다른 레이아웃
- 다국어 제목/문구
- 첨부(PDF/Excel) 경로의 메일 본문 — 현재 `AiReportPdfService.BuildEmailBody`가 따로 있어
  합성기 적용 시 별도 검토 필요
- `IEmailSender` / `IEmailService` 두 메일 인터페이스 통합 (별개 이슈지만 발신자 표시명을
  레이아웃에서 관리하려면 결국 정리해야 함)
