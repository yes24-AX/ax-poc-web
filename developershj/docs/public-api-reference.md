# YES24 OpenAPI - Public API 레퍼런스

> **Base URL**: `https://{host}/v1`  
> **인증 방식**: JWT Bearer Token  
> **Content-Type**: `application/json`

---

## 목차

- [인증](#1-인증-auth)
- [카테고리](#2-카테고리-category)
- [상품](#3-상품-goods)
- [공통 응답 모델](#공통-응답-모델)

---

## 1. 인증 (Auth)

### 1.1 JWT 액세스 토큰 발급

발급받은 API Key로 JWT Bearer 토큰을 발급합니다.  
이후 모든 API 호출 시 `Authorization: Bearer {accessToken}` 헤더를 포함해야 합니다.

- **메서드**: `POST`
- **경로**: `/v1/auth/token`
- **인증 필요 여부**: 불필요 (AnonymousAllowed)

#### 요청 Body

```json
{
  "apiKey": "발급받은 API Key 문자열"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `apiKey` | string | ✅ | 발급받은 API Key |

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "성공",
  "data": {
    "accessToken": "eyJhbGci...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "issuedAt": 1717574433
  },
  "errorCode": null
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessToken` | string | JWT 액세스 토큰 |
| `tokenType` | string | 토큰 타입 (항상 `Bearer`) |
| `expiresIn` | integer | 만료 시간 (초) |
| `issuedAt` | long | 발급 시각 (Unix timestamp) |

**401 Unauthorized**

```json
{
  "success": false,
  "message": "유효하지 않은 API Key입니다.",
  "errorCode": "AUTH_001"
}
```

---

## 2. 카테고리 (Category)

> **Base Path**: `/v1/category`  
> **인증 필요**: ✅ Bearer Token

### 2.1 카테고리 목록 조회

예스24의 분야별 카테고리 목록을 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/list`

#### 요청 파라미터

없음

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "성공",
  "data": {
    "meta": { ... },
    "data": [
      {
        "categoryId": "001",
        "categoryName": "국내도서",
        "categoryFullPath": "국내도서",
        "categoryUrl": "https://yes24.com/product/category/display/001"
      }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `categoryId` | string | 카테고리 ID |
| `categoryName` | string | 카테고리 명 |
| `categoryFullPath` | string | 카테고리 전체 경로 |
| `categoryUrl` | string | 카테고리 페이지 URL |

**404 Not Found** — `CATEGORY_001`

---

### 2.2 베스트셀러(실시간) 조회

지정된 카테고리의 실시간 베스트셀러 목록을 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/bestsellerRealtime`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`  
**404 Not Found** — `BEST_001`

---

### 2.3 베스트셀러(종합) 조회

종합 집계 기준의 베스트셀러 목록을 조회합니다. 성별·연령 필터를 지원합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/bestseller`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `sex` | string | ❌ | `A` | 성별 필터 — `A`(전체), `M`(남성), `F`(여성) |
| `age` | integer | ❌ | `255` | 연령 필터 — `255`(전체), `10`(10대), `20`(20대), `30`(30대), `40`(40대), `50`(50대), `60`(60대이상) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 (최대 100) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`  
**404 Not Found** — `BEST_001`

---

### 2.4 베스트셀러(특가) 조회

특가 집계 기준의 베스트셀러 목록을 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/bestsellerDeal`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `sex` | string | ❌ | `A` | 성별 필터 — `A`(전체), `M`(남성), `F`(여성) |
| `age` | integer | ❌ | `255` | 연령 필터 — `255`(전체), `10`(10대), `20`(20대), `30`(30대), `40`(40대), `50`(50대), `60`(60대이상) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 (최대 100) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`  
**404 Not Found** — `BEST_001`

---

### 2.5 베스트셀러(스테디셀러) 조회

스테디셀러 목록을 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/bestsellerSteady`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `sex` | string | ❌ | `A` | 성별 필터 — `A`(전체), `M`(남성), `F`(여성) |
| `age` | integer | ❌ | `255` | 연령 필터 — `255`(전체), `10`(10대), `20`(20대), `30`(30대), `40`(40대), `50`(50대), `60`(60대이상) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 (최대 100) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`  
**404 Not Found** — `BEST_001`

---

### 2.6 신상품 조회

특정 카테고리의 신상품 목록을 조회합니다. 정렬 옵션을 지원합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/newproduct`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `sort` | string | ❌ | `RegDate` | 정렬 코드 — `RegDate`(등록일순), `Sales`(판매량순), `New`(신상품순), `LowPrice`(최저가순), `HighPrice`(최고가순), `Name`(상품명순) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 (최대 100) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`, 잘못된 `sort` 값 시 `INVALID_SORT`  
**404 Not Found** — `NEW_001`

---

### 2.7 주목할 신상품 조회

편집 기준으로 선별된 주목할 신상품 목록을 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/category/newproductAttention`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `cetegoryId` | string | ✅ | — | 카테고리 ID |
| `sort` | string | ❌ | `RegDate` | 정렬 코드 — `RegDate`(등록일순), `Sales`(판매량순), `New`(신상품순), `LowPrice`(최저가순), `HighPrice`(최고가순), `Name`(상품명순) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 (최대 100) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `cetegoryId` 미입력 시 `INVALID_PARAM`, 잘못된 `sort` 값 시 `INVALID_SORT`  
**404 Not Found** — `ATTN_001`

---

## 3. 상품 (Goods)

> **Base Path**: `/v1/goods`  
> **인증 필요**: ✅ Bearer Token

### 3.1 상품 검색

검색어로 상품 목록을 페이징 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/goods/itemList`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `query` | string | ✅ | — | 검색어 |
| `category` | string | ❌ | `ALL` | 검색 카테고리 — `ALL`(전체), `BOOK`(국내도서), `FOREIGN`(외국도서), `EBOOK`(전자책), `MUSIC`(음반), `DVD`(DVD) |
| `sort` | string | ❌ | `DEFAULT` | 정렬 방식 — `DEFAULT`(인기도순), `RELATION`(정확도순), `RECENT`(신상품순), `REG_DTS`(등록일순) |
| `page` | integer | ❌ | `1` | 페이지 번호 |
| `pageSize` | integer | ❌ | `20` | 페이지 크기 |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `query` 미입력 시 `INVALID_PARAM`  
**404 Not Found** — `SEARCH_001`

---

### 3.2 상품 상세 조회

상품 번호 또는 ISBN13으로 상품 상세 정보를 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/goods/itemDetail`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `searchType` | string | ❌ | `ISBN13` | 검색 유형 — `ISBN13`, `ItemId` |
| `query` | string | ✅ | — | ISBN13 값 또는 상품 번호(ItemId) |
| `detail` | string | ❌ | `N` | 상세정보 포함 여부 (`Y`: 전체정보, `N`: 간단정보) |

**400 Bad Request** — `query` 미입력 또는 잘못된 값 시 `INVALID_PARAM`  
**404 Not Found** — ISBN13 미매칭 시 `GOODS_002`, 상품 없음 시 `GOODS_001`

---

### 3.3 상품 목차 조회

상품의 목차 정보를 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/goods/content`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `searchType` | string | ❌ | `ISBN13` | 검색 유형 — `ISBN13`, `ItemId` |
| `query` | string | ✅ | — | ISBN13 값 또는 상품 번호(ItemId) |

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "성공",
  "data": {
    "meta": { ... },
    "data": {
      "itemId": 12345678,
      "contents": "1장. 서론\n2장. 본론\n..."
    }
  }
}
```

**400 Bad Request** — `INVALID_PARAM`  
**404 Not Found** — `GOODS_002` (ISBN13 미매칭), `GOODS_001` (목차 없음)

---

### 3.4 작가 기본 정보 조회

상품 번호 또는 ISBN13으로 작가의 기본 정보를 조회합니다.

- **메서드**: `GET`
- **경로**: `/v1/goods/author`

#### 요청 파라미터 (Query String)

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `searchType` | string | ❌ | `ISBN13` | 검색 유형 — `ISBN13`, `ItemId` |
| `query` | string | ✅ | — | ISBN13 값 또는 상품 번호(ItemId) |

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "성공",
  "data": {
    "meta": { ... },
    "data": {
      "authorId": 100001,
      "author": "홍길동",
      "authorType": "저자",
      "birthDate": "1970-01-01",
      "deathDate": "",
      "debutTitle": "첫 번째 작품",
      "details": "작가 소개 내용...",
      "link": "https://yes24.com/product/author/100001"
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `authorId` | integer | 작가 번호 |
| `author` | string | 작가명 |
| `authorType` | string | 작가 구분 |
| `birthDate` | string | 생년월일 |
| `deathDate` | string | 사망일 |
| `debutTitle` | string | 데뷔작 제목 |
| `details` | string | 작가 소개 |
| `link` | string | 작가 페이지 URL |

**400 Bad Request** — `INVALID_PARAM`  
**404 Not Found** — `GOODS_002` (ISBN13 미매칭), `AUTHOR_404` (작가 없음)

---

## 공통 응답 모델

### ApiResponse\<T\>

모든 API의 최상위 응답 래퍼입니다.

```json
{
  "success": true,
  "message": "성공",
  "data": { ... },
  "errorCode": null
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 요청 성공 여부 |
| `message` | string | 응답 메시지 |
| `data` | T | 응답 데이터 (실패 시 null) |
| `errorCode` | string? | 에러 코드 (성공 시 null) |

---

### PagedResult\<T\>

페이징이 적용된 상품 목록 응답에 사용됩니다.

```json
{
  "meta": { ... },
  "items": [ ... ],
  "currentPage": 1,
  "pageSize": 20,
  "totalCount": 100
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `meta` | ResponseMeta | 응답 메타 정보 |
| `items` | T[] | 아이템 목록 |
| `currentPage` | integer | 현재 페이지 번호 |
| `pageSize` | integer | 페이지 크기 |
| `totalCount` | integer | 전체 데이터 수 |

---

### DataWithMeta\<T\>

단건 데이터(목차, 작가 정보 등) 응답에 사용됩니다.

```json
{
  "meta": { ... },
  "data": { ... }
}
```

---

### ResponseMeta

응답 메타 정보입니다.

```json
{
  "apiTitle": "상품 검색",
  "apiLink": "https://host/v1/goods/itemList?query=test",
  "logoUrl": "https://yes24.com/favicon.ico",
  "pubDate": "2026-06-05T00:00:00.0000000Z",
  "query": "?query=test",
  "version": "v1"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `apiTitle` | string | API 제목 |
| `apiLink` | string | 요청 URL |
| `logoUrl` | string | YES24 로고 URL |
| `pubDate` | string | 응답 일시 (ISO 8601) |
| `query` | string | 요청 쿼리 문자열 |
| `version` | string | API 버전 |

---

### GoodsSimpleInfo (detail=N 기본값)

| 필드 | 타입 | 설명 |
|------|------|------|
| `sortOrder` | integer | 순서 |
| `itemId` | integer | 상품 번호 |
| `title` | string | 상품 제목 |
| `author` | string | 저자 |
| `goodsType` | string | 상품 유형 |
| `adultYn` | string | 성인물 여부 (`Y`/`N`) |
| `publisher` | string | 출판사 |
| `isbn10` | string | ISBN10 |
| `isbn13` | string | ISBN13 |
| `shopPrice` | decimal | 정가 |
| `salePrice` | decimal | 판매가 |
| `publishDate` | string | 출간일 |
| `itemStatus` | string | 판매 상태 |
| `cover` | string | 커버 이미지 URL |
| `link` | string | 상품 페이지 URL |
| `contentDetail` | object? | 상품 소개/요약/목차 (optional) |

---

### GoodsInfo (detail=Y 전체정보)

GoodsSimpleInfo의 모든 필드에 아래 필드가 추가됩니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `subTitle` | string | 부제목 |
| `originalTitle` | string? | 원제 |
| `originalTranslation` | string? | 번역서 여부 |
| `pages` | integer? | 페이지 수 |
| `yesPoint` | integer? | YES 포인트 |
| `salePoint` | integer? | 판매지수 |
| `fixedBookPriceYn` | string | 도서정가제 여부 |
| `starScore` | double | 별점 (리뷰 점수 평균) |
| `series` | array | 시리즈 목록 |
| `compositions` | array? | 구성 목록 |
| `bookInside` | array? | 책속으로 목록 |
| `recommendations` | array? | 추천평 목록 |
| `yes24Reviews` | array? | YES24 리뷰 목록 |
| `publisherReviews` | array? | 제작사 리뷰 목록 |
| `mdEditTexts` | array? | MD 편집 문구 목록 |

---

## 에러 코드 목록

| 에러 코드 | 설명 |
|-----------|------|
| `AUTH_001` | apiKey 누락 또는 유효하지 않은 API Key |
| `INVALID_PARAM` | 필수 파라미터 누락 또는 잘못된 값 |
| `INVALID_SORT` | 유효하지 않은 sort 값 |
| `CATEGORY_001` | 카테고리 결과 없음 |
| `BEST_001` | 베스트셀러 결과 없음 |
| `NEW_001` | 신상품 결과 없음 |
| `ATTN_001` | 주목할 신상품 결과 없음 |
| `SEARCH_001` | 검색 결과 없음 |
| `GOODS_001` | 상품 정보 없음 |
| `GOODS_002` | ISBN13에 해당하는 상품 없음 |
| `AUTHOR_404` | 작가 정보 없음 |
