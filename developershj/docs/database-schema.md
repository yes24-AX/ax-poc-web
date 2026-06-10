# YES24 Developer Portal — Database Schema

> DBMS: **Microsoft SQL Server** (MSSQL)  
> 기준 버전: SQL Server 2019+  
> 최종 수정: 2026-06-08

---

## 목차

1. [개요](#개요)
2. [ERD 요약](#erd-요약)
3. [테이블 정의](#테이블-정의)
   - [users](#1-users)
   - [applications](#2-applications)
   - [api_keys](#3-api_keys)
   - [api_usage_logs](#4-api_usage_logs)
4. [MSSQL 생성 스크립트](#mssql-생성-스크립트)
5. [주요 쿼리 예시](#주요-쿼리-예시)

---

## 개요

YES24 Developer Portal은 외부 개발자가 API Key를 발급받고 사용량을 관리하는 포털입니다.  
YES24 계정이 없는 외부 개발자도 이메일 기반으로 계정을 생성할 수 있으며, YES24 아이디는 선택적으로 연동할 수 있습니다.

**주요 데이터 흐름**

```
API Key 신청 (contact_email 입력)
    → applications 레코드 생성
    → api_keys 레코드 생성 (key_hash 저장)
    → 이메일로 계정 설정 링크 발송
    → users 레코드 생성 (이메일 인증 후)
    → API 호출 시 api_usage_logs 적재
```

---

## ERD 요약

```
users (1) ─────────────── (N) applications
                                    │
                                    └── (1) ─── (N) api_keys
                                                        │
                                                        └── (1) ─── (N) api_usage_logs
```

---

## 테이블 정의

### 1. users

Developer Portal 계정. YES24 계정 보유 여부와 무관하게 이메일로 생성됩니다.

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `user_id` | INT IDENTITY | NOT NULL | — | PK, 자동 증가 |
| `email` | NVARCHAR(255) | NOT NULL | — | 로그인 식별자 (unique) |
| `password_hash` | NVARCHAR(255) | NULL | NULL | bcrypt 해시. 이메일 인증 전 NULL |
| `yes24_id` | NVARCHAR(100) | NULL | NULL | YES24 계정 아이디 (선택 연동) |
| `email_verified` | BIT | NOT NULL | 0 | 이메일 인증 여부 |
| `agree_marketing` | BIT | NOT NULL | 0 | 마케팅 정보 수신 동의 |
| `created_at` | DATETIME2 | NOT NULL | GETDATE() | 계정 생성일 |
| `updated_at` | DATETIME2 | NOT NULL | GETDATE() | 최종 수정일 |

---

### 2. applications

API Key 신청 단위. 하나의 사용자 계정에 여러 앱을 등록할 수 있습니다.  
비로그인 상태에서도 신청 가능하므로 `user_id`는 NULL 허용이며, 이후 계정 생성 시 연결됩니다.

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `app_id` | INT IDENTITY | NOT NULL | — | PK |
| `user_id` | INT | NULL | NULL | FK → users.user_id |
| `service_name` | NVARCHAR(200) | NOT NULL | — | 서비스명 |
| `domain` | NVARCHAR(500) | NOT NULL | — | 서비스 URL |
| `description` | NVARCHAR(MAX) | NOT NULL | — | 서비스 설명 |
| `use_purpose` | NVARCHAR(MAX) | NOT NULL | — | API 사용 목적 |
| `contact_name` | NVARCHAR(100) | NOT NULL | — | 담당자명 |
| `contact_email` | NVARCHAR(255) | NOT NULL | — | 담당자 이메일 |
| `contact_phone` | NVARCHAR(30) | NULL | NULL | 담당자 연락처 (선택) |
| `agree_terms` | BIT | NOT NULL | 0 | 이용약관 동의 |
| `agree_privacy` | BIT | NOT NULL | 0 | 개인정보 수집·이용 동의 |
| `agree_third_party` | BIT | NOT NULL | 0 | 개인정보 제3자 제공 동의 |
| `status` | NVARCHAR(20) | NOT NULL | 'active' | active / inactive / suspended |
| `applied_at` | DATETIME2 | NOT NULL | GETDATE() | 신청일 |
| `updated_at` | DATETIME2 | NOT NULL | GETDATE() | 최종 수정일 |

---

### 3. api_keys

발급된 API Key 정보. Key 원문은 저장하지 않고 해시만 저장합니다.

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `key_id` | INT IDENTITY | NOT NULL | — | PK |
| `app_id` | INT | NOT NULL | — | FK → applications.app_id |
| `key_prefix` | NVARCHAR(20) | NOT NULL | 'yk_live_' | Key 접두사 |
| `key_hash` | NVARCHAR(255) | NOT NULL | — | Key 전체 SHA-256 해시 (인증 검증용) |
| `key_suffix` | NCHAR(4) | NOT NULL | — | Key 마지막 4자리 (마스킹 표시용) |
| `status` | NVARCHAR(20) | NOT NULL | 'active' | active / revoked |
| `issued_at` | DATETIME2 | NOT NULL | GETDATE() | 발급일 |
| `revoked_at` | DATETIME2 | NULL | NULL | 폐기일 (NULL = 유효) |
| `last_used_at` | DATETIME2 | NULL | NULL | 마지막 호출 시각 |

> **보안 원칙**: Key 원문은 최초 발급 화면에서만 노출하며 DB에는 절대 저장하지 않습니다.  
> API 호출 인증 시 `SHA2_256(key_input)` 와 `key_hash` 를 비교합니다.

---

### 4. api_usage_logs

API 호출 로그. 사용량 통계 및 오류율 집계에 사용됩니다.

| 컬럼명 | 타입 | NULL | 기본값 | 설명 |
|--------|------|------|--------|------|
| `log_id` | BIGINT IDENTITY | NOT NULL | — | PK |
| `key_id` | INT | NOT NULL | — | FK → api_keys.key_id |
| `endpoint` | NVARCHAR(200) | NOT NULL | — | 호출 엔드포인트 (예: /v1/books) |
| `method` | NVARCHAR(10) | NOT NULL | — | HTTP 메서드 (GET / POST 등) |
| `status_code` | SMALLINT | NOT NULL | — | HTTP 응답 코드 |
| `response_time_ms` | INT | NOT NULL | — | 응답 시간 (밀리초) |
| `is_error` | BIT | NOT NULL | 0 | 오류 여부 (status_code >= 400) |
| `called_at` | DATETIME2 | NOT NULL | GETDATE() | 호출 시각 |

> 로그 데이터는 대용량이 예상되므로 `called_at` 기준 **파티셔닝** 또는 월별 아카이빙을 권장합니다.

---

## MSSQL 생성 스크립트

```sql
-- ============================================================
-- YES24 Developer Portal - Database Schema
-- DBMS: Microsoft SQL Server 2019+
-- ============================================================

USE YesDeveloperPortal;   -- 데이터베이스 이름에 맞게 변경
GO

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
    user_id        INT            IDENTITY(1,1)  NOT NULL,
    email          NVARCHAR(255)                 NOT NULL,
    password_hash  NVARCHAR(255)                 NULL,
    yes24_id       NVARCHAR(100)                 NULL,
    email_verified BIT                           NOT NULL  DEFAULT 0,
    agree_marketing BIT                          NOT NULL  DEFAULT 0,
    created_at     DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),
    updated_at     DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),

    CONSTRAINT PK_users PRIMARY KEY (user_id),
    CONSTRAINT UQ_users_email UNIQUE (email)
);
GO

-- YES24 아이디 중복 방지 (값이 있는 경우만 unique)
CREATE UNIQUE INDEX UX_users_yes24_id
    ON users (yes24_id)
    WHERE yes24_id IS NOT NULL;
GO


-- ============================================================
-- 2. applications
-- ============================================================
CREATE TABLE applications (
    app_id           INT            IDENTITY(1,1)  NOT NULL,
    user_id          INT                           NULL,
    service_name     NVARCHAR(200)                 NOT NULL,
    domain           NVARCHAR(500)                 NOT NULL,
    description      NVARCHAR(MAX)                 NOT NULL,
    use_purpose      NVARCHAR(MAX)                 NOT NULL,
    contact_name     NVARCHAR(100)                 NOT NULL,
    contact_email    NVARCHAR(255)                 NOT NULL,
    contact_phone    NVARCHAR(30)                  NULL,
    agree_terms      BIT                           NOT NULL  DEFAULT 0,
    agree_privacy    BIT                           NOT NULL  DEFAULT 0,
    agree_third_party BIT                          NOT NULL  DEFAULT 0,
    status           NVARCHAR(20)                  NOT NULL  DEFAULT 'active',
    applied_at       DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),
    updated_at       DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),

    CONSTRAINT PK_applications PRIMARY KEY (app_id),
    CONSTRAINT FK_applications_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT CK_applications_status
        CHECK (status IN ('active', 'inactive', 'suspended'))
);
GO

CREATE INDEX IX_applications_user_id   ON applications (user_id);
CREATE INDEX IX_applications_contact_email ON applications (contact_email);
GO


-- ============================================================
-- 3. api_keys
-- ============================================================
CREATE TABLE api_keys (
    key_id        INT            IDENTITY(1,1)  NOT NULL,
    app_id        INT                           NOT NULL,
    key_prefix    NVARCHAR(20)                  NOT NULL  DEFAULT 'yk_live_',
    key_hash      NVARCHAR(255)                 NOT NULL,
    key_suffix    NCHAR(4)                      NOT NULL,
    status        NVARCHAR(20)                  NOT NULL  DEFAULT 'active',
    issued_at     DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),
    revoked_at    DATETIME2(0)                  NULL,
    last_used_at  DATETIME2(0)                  NULL,

    CONSTRAINT PK_api_keys PRIMARY KEY (key_id),
    CONSTRAINT FK_api_keys_app FOREIGN KEY (app_id)
        REFERENCES applications (app_id) ON DELETE CASCADE,
    CONSTRAINT UQ_api_keys_hash UNIQUE (key_hash),
    CONSTRAINT CK_api_keys_status
        CHECK (status IN ('active', 'revoked'))
);
GO

CREATE INDEX IX_api_keys_app_id    ON api_keys (app_id);
CREATE INDEX IX_api_keys_key_hash  ON api_keys (key_hash);  -- 인증 조회용
CREATE INDEX IX_api_keys_status    ON api_keys (status);
GO


-- ============================================================
-- 4. api_usage_logs
-- ============================================================
CREATE TABLE api_usage_logs (
    log_id           BIGINT         IDENTITY(1,1)  NOT NULL,
    key_id           INT                           NOT NULL,
    endpoint         NVARCHAR(200)                 NOT NULL,
    method           NVARCHAR(10)                  NOT NULL,
    status_code      SMALLINT                      NOT NULL,
    response_time_ms INT                           NOT NULL,
    is_error         BIT                           NOT NULL  DEFAULT 0,
    called_at        DATETIME2(0)                  NOT NULL  DEFAULT GETDATE(),

    CONSTRAINT PK_api_usage_logs PRIMARY KEY (log_id),
    CONSTRAINT FK_api_usage_logs_key FOREIGN KEY (key_id)
        REFERENCES api_keys (key_id) ON DELETE CASCADE
);
GO

-- 사용량 집계 쿼리 성능을 위한 복합 인덱스
CREATE INDEX IX_api_usage_logs_key_called
    ON api_usage_logs (key_id, called_at DESC)
    INCLUDE (endpoint, is_error, response_time_ms);

CREATE INDEX IX_api_usage_logs_called_at
    ON api_usage_logs (called_at DESC);
GO
```

---

## 주요 쿼리 예시

### API Key 인증 검증

```sql
-- X-API-Key 헤더값의 해시와 비교하여 유효한 Key인지 확인
SELECT
    k.key_id,
    k.app_id,
    a.user_id,
    a.status AS app_status
FROM api_keys k
JOIN applications a ON k.app_id = a.app_id
WHERE k.key_hash    = CONVERT(NVARCHAR(255), HASHBYTES('SHA2_256', @input_key), 2)
  AND k.status      = 'active'
  AND a.status      = 'active';
```

### 앱별 오늘 사용량 집계

```sql
SELECT
    k.key_id,
    a.service_name,
    COUNT(*)                              AS total_calls,
    SUM(CASE WHEN l.is_error = 1 THEN 1 ELSE 0 END) AS error_count,
    AVG(l.response_time_ms)               AS avg_response_ms,
    CAST(SUM(CASE WHEN l.is_error = 1 THEN 1.0 ELSE 0 END)
         / COUNT(*) * 100 AS DECIMAL(5,2)) AS error_rate_pct
FROM api_usage_logs l
JOIN api_keys k ON l.key_id = k.key_id
JOIN applications a ON k.app_id = a.app_id
WHERE l.called_at >= CAST(GETDATE() AS DATE)
  AND a.user_id = @user_id
GROUP BY k.key_id, a.service_name;
```

### Endpoint별 호출량

```sql
SELECT
    l.endpoint,
    l.method,
    COUNT(*)                                          AS call_count,
    AVG(l.response_time_ms)                           AS avg_ms,
    CAST(SUM(CASE WHEN l.is_error = 1 THEN 1.0 ELSE 0 END)
         / COUNT(*) * 100 AS DECIMAL(5,2))             AS error_rate_pct
FROM api_usage_logs l
WHERE l.key_id   = @key_id
  AND l.called_at >= CAST(GETDATE() AS DATE)
GROUP BY l.endpoint, l.method
ORDER BY call_count DESC;
```

### 사용자 앱 목록 조회 (마지막 호출 시각 포함)

```sql
SELECT
    a.app_id,
    a.service_name,
    a.status,
    a.applied_at,
    k.key_id,
    k.key_suffix,
    k.status        AS key_status,
    k.last_used_at
FROM applications a
LEFT JOIN api_keys k
    ON k.app_id = a.app_id AND k.status = 'active'
WHERE a.user_id = @user_id
ORDER BY a.applied_at DESC;
```

### contact_email로 계정 연결 (신청 후 로그인 시)

```sql
-- 신규 users 레코드 생성 후 기존 applications에 user_id 연결
UPDATE applications
SET    user_id    = @new_user_id,
       updated_at = GETDATE()
WHERE  contact_email = @email
  AND  user_id IS NULL;
```

---

> **참고**: `api_usage_logs`는 호출량에 따라 데이터가 빠르게 증가합니다.  
> `called_at` 기준으로 월별 파티셔닝 또는 보존 기간(예: 90일) 정책을 설정하는 것을 권장합니다.
