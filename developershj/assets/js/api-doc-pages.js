const API_DOCS = {
  'category-list': {
    group: 'Category API',
    title: 'GET /v1/category/list',
    shortPath: '/category/list',
    pageTitle: '카테고리 목록 조회',
    desc: 'YES24 분야별 카테고리 목록을 조회합니다. 카테고리 ID, 카테고리명, 전체 경로, 카테고리 URL을 제공합니다.',
    endpoint: '/v1/category/list',
    params: [],
    responseType: 'categoryList',
    errors: [['404', 'CATEGORY_001', '카테고리 결과가 없습니다.']]
  },
  'category-bestseller-realtime': {
    group: 'Category API',
    title: 'GET /v1/category/bestsellerRealtime',
    shortPath: '/category/bestsellerRealtime',
    pageTitle: '실시간 베스트셀러 조회',
    desc: '지정한 카테고리의 실시간 베스트셀러 목록을 조회합니다.',
    endpoint: '/v1/category/bestsellerRealtime',
    params: [['cetegoryId', 'string', '필수', '-', '카테고리 ID'], ['detail', 'string', '선택', 'N', '상세 정보 포함 여부']],
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', 'cetegoryId가 없거나 잘못되었습니다.'], ['404', 'BEST_001', '베스트셀러 결과가 없습니다.']]
  },
  'category-bestseller': {
    group: 'Category API',
    title: 'GET /v1/category/bestseller',
    shortPath: '/category/bestseller',
    pageTitle: '종합 베스트셀러 조회',
    desc: '종합 집계 기준의 베스트셀러 목록을 조회합니다. 성별, 연령, 페이지 조건을 함께 지정할 수 있습니다.',
    endpoint: '/v1/category/bestseller',
    params: bestsellerParams(),
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['404', 'BEST_001', '베스트셀러 결과가 없습니다.']]
  },
  'category-bestseller-deal': {
    group: 'Category API',
    title: 'GET /v1/category/bestsellerDeal',
    shortPath: '/category/bestsellerDeal',
    pageTitle: '특가 베스트셀러 조회',
    desc: '특가 집계 기준의 베스트셀러 상품 목록을 조회합니다.',
    endpoint: '/v1/category/bestsellerDeal',
    params: bestsellerParams(),
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['404', 'BEST_001', '베스트셀러 결과가 없습니다.']]
  },
  'category-bestseller-steady': {
    group: 'Category API',
    title: 'GET /v1/category/bestsellerSteady',
    shortPath: '/category/bestsellerSteady',
    pageTitle: '스테디셀러 조회',
    desc: '긴 기간 동안 꾸준히 판매되는 스테디셀러 목록을 조회합니다.',
    endpoint: '/v1/category/bestsellerSteady',
    params: bestsellerParams(),
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['404', 'BEST_001', '베스트셀러 결과가 없습니다.']]
  },
  'category-newproduct': {
    group: 'Category API',
    title: 'GET /v1/category/newproduct',
    shortPath: '/category/newproduct',
    pageTitle: '신상품 조회',
    desc: '특정 카테고리의 신상품 목록을 조회합니다. 등록일, 판매량, 가격, 상품명 기준 정렬을 지원합니다.',
    endpoint: '/v1/category/newproduct',
    params: newProductParams(),
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['400', 'INVALID_SORT', 'sort 값이 잘못되었습니다.'], ['404', 'NEW_001', '신상품 결과가 없습니다.']]
  },
  'category-newproduct-attention': {
    group: 'Category API',
    title: 'GET /v1/category/newproductAttention',
    shortPath: '/category/newproductAttention',
    pageTitle: '주목할 신상품 조회',
    desc: '편집 기준으로 선별한 주목할 신상품 목록을 조회합니다.',
    endpoint: '/v1/category/newproductAttention',
    params: newProductParams(),
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['400', 'INVALID_SORT', 'sort 값이 잘못되었습니다.'], ['404', 'ATTN_001', '주목할 신상품 결과가 없습니다.']]
  },
  'goods-item-list': {
    group: 'Goods API',
    title: 'GET /v1/goods/itemList',
    shortPath: '/goods/itemList',
    pageTitle: '상품 검색',
    desc: '검색어로 상품 목록을 페이지 단위로 조회합니다. 검색 카테고리, 정렬 방식, 상세 정보 포함 여부를 지정할 수 있습니다.',
    endpoint: '/v1/goods/itemList',
    params: [
      ['query', 'string', '필수', '-', '검색어'],
      ['category', 'string', '선택', 'ALL', '검색 카테고리(ALL, BOOK, FOREIGN, EBOOK, MUSIC, DVD)'],
      ['sort', 'string', '선택', 'DEFAULT', '정렬 방식(DEFAULT, RELATION, RECENT, REG_DTS)'],
      ['page', 'integer', '선택', '1', '페이지 번호'],
      ['pageSize', 'integer', '선택', '20', '페이지 크기'],
      ['detail', 'string', '선택', 'N', '상세 정보 포함 여부(Y 또는 N)']
    ],
    responseType: 'goodsList',
    errors: [['400', 'INVALID_PARAM', 'query가 없거나 값이 잘못되었습니다.'], ['404', 'SEARCH_001', '검색 결과가 없습니다.']]
  },
  'goods-item-detail': {
    group: 'Goods API',
    title: 'GET /v1/goods/itemDetail',
    shortPath: '/goods/itemDetail',
    pageTitle: '상품 상세 조회',
    desc: '상품 번호 또는 ISBN13으로 상품 상세 정보를 조회합니다.',
    endpoint: '/v1/goods/itemDetail',
    params: goodsLookupParams(true),
    responseType: 'goodsDetail',
    errors: [['400', 'INVALID_PARAM', 'query가 없거나 searchType 값이 잘못되었습니다.'], ['404', 'GOODS_002', 'ISBN13에 해당하는 상품이 없습니다.'], ['404', 'GOODS_001', '상품 정보가 없습니다.']]
  },
  'goods-content': {
    group: 'Goods API',
    title: 'GET /v1/goods/content',
    shortPath: '/goods/content',
    pageTitle: '상품 목차 조회',
    desc: '상품 번호 또는 ISBN13으로 상품 목차 정보를 조회합니다.',
    endpoint: '/v1/goods/content',
    params: goodsLookupParams(false),
    responseType: 'goodsContent',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['404', 'GOODS_002', 'ISBN13에 해당하는 상품이 없습니다.'], ['404', 'GOODS_001', '목차 정보가 없습니다.']]
  },
  'goods-author': {
    group: 'Goods API',
    title: 'GET /v1/goods/author',
    shortPath: '/goods/author',
    pageTitle: '작가 기본 정보 조회',
    desc: '상품 번호 또는 ISBN13으로 작가 기본 정보를 조회합니다.',
    endpoint: '/v1/goods/author',
    params: goodsLookupParams(false),
    responseType: 'goodsAuthor',
    errors: [['400', 'INVALID_PARAM', '필수 파라미터가 없거나 값이 잘못되었습니다.'], ['404', 'GOODS_002', 'ISBN13에 해당하는 상품이 없습니다.'], ['404', 'AUTHOR_404', '작가 정보가 없습니다.']]
  }
};

const API_DOC_ORDER = Object.keys(API_DOCS);
const API_DOC_FILES = {
  'category-list': 'api-category-list.html',
  'category-bestseller-realtime': 'api-category-bestseller-realtime.html',
  'category-bestseller': 'api-category-bestseller.html',
  'category-bestseller-deal': 'api-category-bestseller-deal.html',
  'category-bestseller-steady': 'api-category-bestseller-steady.html',
  'category-newproduct': 'api-category-newproduct.html',
  'category-newproduct-attention': 'api-category-newproduct-attention.html',
  'goods-item-list': 'api-goods-item-list.html',
  'goods-item-detail': 'api-goods-item-detail.html',
  'goods-content': 'api-goods-content.html',
  'goods-author': 'api-goods-author.html'
};

function bestsellerParams() {
  return [
    ['cetegoryId', 'string', '필수', '-', '카테고리 ID'],
    ['sex', 'string', '선택', 'A', '성별 필터(A 전체, M 남성, F 여성)'],
    ['age', 'integer', '선택', '255', '연령 필터(255 전체, 10/20/30/40/50/60)'],
    ['page', 'integer', '선택', '1', '페이지 번호'],
    ['pageSize', 'integer', '선택', '20', '페이지 크기(최대 100)'],
    ['detail', 'string', '선택', 'N', '상세 정보 포함 여부(Y 또는 N)']
  ];
}

function newProductParams() {
  return [
    ['cetegoryId', 'string', '필수', '-', '카테고리 ID'],
    ['sort', 'string', '선택', 'RegDate', '정렬 코드(RegDate, Sales, New, LowPrice, HighPrice, Name)'],
    ['page', 'integer', '선택', '1', '페이지 번호'],
    ['pageSize', 'integer', '선택', '20', '페이지 크기(최대 100)'],
    ['detail', 'string', '선택', 'N', '상세 정보 포함 여부']
  ];
}

function goodsLookupParams(includeDetail) {
  const params = [
    ['searchType', 'string', '필수', 'ISBN13', '검색 유형(ISBN13 또는 ItemId)'],
    ['query', 'string', '필수', '-', 'ISBN13 값 또는 상품 번호(ItemId)']
  ];
  if (includeDetail) params.push(['detail', 'string', '선택', 'N', '상세 정보 포함 여부(Y 전체 정보, N 간단 정보)']);
  return params;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function table(headers, rows) {
  return `<table class="doc-table">
    <thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function endpointRows(group, activeKey) {
  return API_DOC_ORDER
    .filter(key => API_DOCS[key].group === group)
    .map(key => `<li><a href="${API_DOC_FILES[key]}"${key === activeKey ? ' class="active"' : ''}>${esc(API_DOCS[key].pageTitle)}</a></li>`)
    .join('');
}

function paramTable(params) {
  if (!params.length) return '<p>요청 Query Parameter가 없습니다.</p>';
  return table(['파라미터', '타입', '필수', '기본값', '설명'], params);
}

function errorTable(errors) {
  return `<table class="doc-table">
    <thead><tr><th>HTTP</th><th>오류 코드</th><th>설명</th></tr></thead>
    <tbody>
      <tr><td><span class="badge badge-danger">401</span></td><td><code>AUTH_001</code></td><td>API Key가 없거나 유효하지 않습니다.</td></tr>
      ${errors.map(([status, code, desc]) => `<tr><td><span class="badge badge-danger">${esc(status)}</span></td><td><code>${esc(code)}</code></td><td>${esc(desc)}</td></tr>`).join('')}
    </tbody>
  </table>`;
}

function exampleUrl(doc) {
  if (!doc.params.length) return `https://api.yes24.com${doc.endpoint}`;
  const query = doc.params
    .filter(([, , required]) => required === '필수')
    .map(([name]) => `${name}=${name === 'query' ? '9788966260959' : name === 'searchType' ? 'ISBN13' : '001'}`)
    .join('&');
  return `https://api.yes24.com${doc.endpoint}?${query}`;
}

function responseMeta(doc) {
  return {
    apiTitle: doc.pageTitle,
    apiLink: `https://api.yes24.com${doc.endpoint}`,
    logoUrl: 'https://www.yes24.com/favicon.ico',
    pubDate: '2026-06-05T00:00:00.0000000Z',
    query: doc.params.length ? '?query=9788966260959' : '',
    version: 'v1'
  };
}

function goodsSimpleItem() {
  return {
    sortOrder: 1,
    itemId: 12345678,
    title: '클린 코드',
    author: '로버트 C. 마틴',
    goodsType: 'BOOK',
    adultYn: 'N',
    publisher: '인사이트',
    isbn10: '8966260950',
    isbn13: '9788966260959',
    shopPrice: 33000,
    salePrice: 29700,
    publishDate: '2013-12-24',
    itemStatus: '판매중',
    cover: 'https://image.yes24.com/goods/12345678/L',
    link: 'https://www.yes24.com/Product/Goods/12345678',
    contentDetail: {
      summary: '좋은 코드와 나쁜 코드를 구분하고 개선하는 방법을 다룹니다.',
      contents: '1장 깨끗한 코드\n2장 의미 있는 이름\n...'
    }
  };
}

function goodsDetailItem() {
  return {
    ...goodsSimpleItem(),
    subTitle: '애자일 소프트웨어 장인 정신',
    originalTitle: 'Clean Code',
    originalTranslation: 'Y',
    pages: 584,
    yesPoint: 1650,
    salePoint: 297,
    fixedBookPriceYn: 'Y',
    starScore: 9.4,
    series: [{ seriesId: 1001, seriesName: '프로그래밍 인사이트' }],
    compositions: [],
    bookInside: [{ title: '책 속으로', content: '깨끗한 코드는 읽기 쉽고 변경하기 쉽습니다.' }],
    recommendations: [{ recommender: 'YES24 MD', content: '개발자에게 오래 읽히는 기본서입니다.' }],
    yes24Reviews: [{ reviewId: 9001, title: '실무에 도움이 됩니다.', score: 10 }],
    publisherReviews: [{ title: '출판사 리뷰', content: '소프트웨어 품질을 고민하는 독자를 위한 책입니다.' }],
    mdEditTexts: [{ title: 'MD 한마디', content: '코드 품질을 다시 보게 만드는 고전입니다.' }]
  };
}

function responseExample(doc) {
  const base = { success: true, message: '성공', errorCode: null };
  if (doc.responseType === 'categoryList') {
    return JSON.stringify({ ...base, data: { meta: responseMeta(doc), data: [{ categoryId: '001', categoryName: '국내도서', categoryFullPath: '국내도서', categoryUrl: 'https://www.yes24.com/Product/Category/Display/001' }] } }, null, 2);
  }
  if (doc.responseType === 'goodsDetail') {
    return JSON.stringify({ ...base, data: { meta: responseMeta(doc), data: goodsDetailItem() } }, null, 2);
  }
  if (doc.responseType === 'goodsContent') {
    return JSON.stringify({ ...base, data: { meta: responseMeta(doc), data: { itemId: 12345678, contents: '1장 깨끗한 코드\n2장 의미 있는 이름\n3장 함수\n...' } } }, null, 2);
  }
  if (doc.responseType === 'goodsAuthor') {
    return JSON.stringify({ ...base, data: { meta: responseMeta(doc), data: { authorId: 100001, author: '로버트 C. 마틴', authorType: '저자', birthDate: '1952-12-05', deathDate: '', debutTitle: 'Clean Code', details: '소프트웨어 장인 정신과 클린 코드 분야의 대표 저자입니다.', link: 'https://www.yes24.com/Product/Search?domain=ALL&query=로버트 C. 마틴' } } }, null, 2);
  }
  return JSON.stringify({ ...base, data: { meta: responseMeta(doc), items: [goodsSimpleItem()], currentPage: 1, pageSize: 20, totalCount: 100 } }, null, 2);
}

function responseFields(doc) {
  const common = [
    ['success', 'boolean', '요청 성공 여부'],
    ['message', 'string', '응답 메시지'],
    ['data', 'T', '응답 데이터'],
    ['errorCode', 'string | null', '오류 코드(성공 시 null)'],
    ['data.meta.apiTitle', 'string', '호출한 API 제목'],
    ['data.meta.apiLink', 'string', '요청 URL'],
    ['data.meta.logoUrl', 'string', 'YES24 로고 URL'],
    ['data.meta.pubDate', 'string', '응답 일시(ISO 8601 형식)'],
    ['data.meta.query', 'string', '요청 쿼리 문자열'],
    ['data.meta.version', 'string', 'API 버전']
  ];
  const simple = [
    ['itemId', 'integer', 'YES24 상품 번호'],
    ['title', 'string', '상품 제목'],
    ['author', 'string', '저자 또는 아티스트명'],
    ['publisher', 'string', '출판사 또는 제작사'],
    ['isbn10', 'string', 'ISBN10'],
    ['isbn13', 'string', 'ISBN13'],
    ['shopPrice', 'decimal', '정가'],
    ['salePrice', 'decimal', '판매가'],
    ['publishDate', 'string', '출간일'],
    ['itemStatus', 'string', '판매 상태'],
    ['cover', 'string', '커버 이미지 URL'],
    ['link', 'string', 'YES24 상품 페이지 URL'],
    ['contentDetail', 'object | null', '상품 소개, 요약, 목차 등 부가 설명']
  ];
  if (doc.responseType === 'categoryList') {
    return common.concat([
      ['data.data', 'Category[]', '카테고리 목록'],
      ['data.data[].categoryId', 'string', '카테고리 ID'],
      ['data.data[].categoryName', 'string', '카테고리 이름'],
      ['data.data[].categoryFullPath', 'string', '카테고리 전체 경로'],
      ['data.data[].categoryUrl', 'string', '카테고리 페이지 URL']
    ]);
  }
  if (doc.responseType === 'goodsList') {
    return common.concat([
      ['data.items', 'GoodsSimpleInfo[] | GoodsInfo[]', '상품 목록(detail=Y 요청 시 GoodsInfo 필드 추가 가능)'],
      ['data.currentPage', 'integer', '현재 페이지 번호'],
      ['data.pageSize', 'integer', '페이지 크기'],
      ['data.totalCount', 'integer', '전체 데이터 수']
    ], simple.map(([name, type, desc]) => [`data.items[].${name}`, type, desc]));
  }
  if (doc.responseType === 'goodsDetail') {
    return common.concat([['data.data', 'GoodsInfo', '상품 상세 정보']], simple.map(([name, type, desc]) => [`data.data.${name}`, type, desc]), [
      ['data.data.subTitle', 'string', '부제목'],
      ['data.data.originalTitle', 'string | null', '원제'],
      ['data.data.pages', 'integer | null', '페이지 수'],
      ['data.data.yesPoint', 'integer | null', 'YES포인트'],
      ['data.data.fixedBookPriceYn', 'string', '도서정가제 적용 여부'],
      ['data.data.starScore', 'double', '리뷰 평점'],
      ['data.data.series', 'array', '시리즈 목록'],
      ['data.data.recommendations', 'array | null', '추천사 목록'],
      ['data.data.yes24Reviews', 'array | null', 'YES24 리뷰 목록'],
      ['data.data.publisherReviews', 'array | null', '출판사 리뷰 목록'],
      ['data.data.mdEditTexts', 'array | null', 'MD 편집 문구 목록']
    ]);
  }
  if (doc.responseType === 'goodsContent') {
    return common.concat([['data.data.itemId', 'integer', 'YES24 상품 번호'], ['data.data.contents', 'string', '상품 목차 내용(줄바꿈 포함 가능)']]);
  }
  return common.concat([
    ['data.data.authorId', 'integer', '작가 번호'],
    ['data.data.author', 'string', '작가명'],
    ['data.data.authorType', 'string', '작가 구분'],
    ['data.data.birthDate', 'string', '생년월일'],
    ['data.data.deathDate', 'string', '사망일(값이 없을 수 있음)'],
    ['data.data.debutTitle', 'string', '데뷔작 제목'],
    ['data.data.details', 'string', '작가 소개 내용'],
    ['data.data.link', 'string', '작가 관련 페이지 URL']
  ]);
}

function renderApiDoc() {
  const key = window.API_DOC_KEY;
  const doc = API_DOCS[key];
  const root = document.getElementById('api-doc-root');
  if (!doc || !root) return;
  document.title = `${doc.title} - YES24 개발자센터`;
  const url = exampleUrl(doc);
  root.innerHTML = `
    <div class="page-docs" style="max-width:none;">
      <aside class="sidebar">
        <div class="sidebar-section">
          <div class="sidebar-section-title">시작하기</div>
          <ul class="sidebar-nav">
            <li><a href="docs.html">개요</a></li>
            <li><a href="docs-apikey.html">API Key 발급</a></li>
          </ul>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-section-title">API 문서</div>
          <ul class="sidebar-nav">
            <li><a href="api-catalog.html">API 카탈로그</a></li>
            <li><a href="api-category-list.html">Category API</a><ul class="sub-nav">${endpointRows('Category API', key)}</ul></li>
            <li><a href="api-goods-item-list.html">Goods API</a><ul class="sub-nav">${endpointRows('Goods API', key)}</ul></li>
            <li><a href="docs-error-codes.html">오류 코드</a></li>
          </ul>
        </div>
      </aside>
      <main class="doc-content">
        <nav class="doc-breadcrumb">
          <a href="index.html">홈</a><span>&gt;</span><a href="docs.html">문서</a><span>&gt;</span><span>${esc(doc.group)}</span><span>&gt;</span><span>${esc(doc.pageTitle)}</span>
        </nav>
        <div class="doc-page-title">
          <h1>${esc(doc.pageTitle)}</h1>
          <p>${esc(doc.desc)}</p>
        </div>
        <h2 id="overview">개요</h2>
        <p>${esc(doc.pageTitle)} API는 ${esc(doc.desc)}</p>
        <h2 id="endpoint">Endpoint</h2>
        <div class="endpoint-block"><span class="method-badge method-get">GET</span><span class="endpoint-url"><span class="url-base">https://api.yes24.com</span><span class="url-path">${esc(doc.endpoint)}</span></span></div>
        <h2 id="params">Query Parameters</h2>
        ${paramTable(doc.params)}
        <h2 id="example">Request Example</h2>
        <div class="code-block"><div class="code-block-header"><span class="code-lang">Shell</span><button class="copy-btn">Copy</button></div><div class="code-block-body"><pre><code>curl -X GET "${esc(url)}" \\
  -H "X-API-Key: yk_live_YOUR_API_KEY"</code></pre></div></div>
        <h2 id="response">Response Example</h2>
        <div class="code-block"><div class="code-block-header"><span class="code-lang">JSON</span><button class="copy-btn">Copy</button></div><div class="code-block-body"><pre><code>${esc(responseExample(doc))}</code></pre></div></div>
        <h2 id="response-fields">Response Fields</h2>
        ${table(['필드', '타입', '설명'], responseFields(doc))}
        <h2 id="errors">오류 코드</h2>
        ${errorTable(doc.errors)}
      </main>
      <aside class="toc-panel">
        <div class="toc-title">이 페이지에서</div>
        <ul class="toc-nav">
          <li><a href="#overview">개요</a></li>
          <li><a href="#endpoint">Endpoint</a></li>
          <li><a href="#params">Query Parameters</a></li>
          <li><a href="#example">Request Example</a></li>
          <li><a href="#response">Response Example</a></li>
          <li><a href="#response-fields">Response Fields</a></li>
          <li><a href="#errors">오류 코드</a></li>
        </ul>
      </aside>
    </div>`;
}

renderApiDoc();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof initTocTracking === 'function') initTocTracking();
  });
} else if (typeof initTocTracking === 'function') {
  initTocTracking();
}
