export const INSTRUMENT_CONTENT = {
  records: [
    { id: 'product-9788936434120', kind: 'product', code: 'PRODUCT', label: '상품', primary: '소년이 온다', secondary: 'ISBN 9788936434120 · 한강 · 창비', accent: '#668cff' },
    { id: 'order-250424-1842', kind: 'order', code: 'ORDER', label: '주문', primary: 'ORD-250424-1842', secondary: '기업 주문 · 28권 · 출고 준비', accent: '#62c6d9' },
    { id: 'sales-monthly', kind: 'sales', code: 'SALES', label: '매출', primary: '이번 달 판매출고', secondary: '₩28,500,000 · 전월 대비 +8.4%', accent: '#d1a65f' },
    { id: 'inventory-paju', kind: 'inventory', code: 'STOCK', label: '재고', primary: '파주 물류센터', secondary: '가용 1,284권 · 공급률 68%', accent: '#62b899' },
    { id: 'member-104892', kind: 'member', code: 'MEMBER', label: '회원', primary: 'M-104892', secondary: '구매 14회 · 최근 주문 4월 24일', accent: '#7aa8de' },
    { id: 'publisher-changbi', kind: 'publisher', code: 'PUBLISHER', label: '출판사', primary: '창비', secondary: '공급 문서 1,842종 · 정산 완료', accent: '#a88bbd' },
    { id: 'author-han-kang', kind: 'author', code: 'AUTHOR', label: '저자', primary: '한강', secondary: '연결 저서 12종 · 판매 추이 상승', accent: '#8997c8' },
    { id: 'bookstore-channel', kind: 'bookstore', code: 'BOOKSTORE', label: '책방', primary: '온라인·지역 책방', secondary: '금주 출고 3,286권 · 42개 거래처', accent: '#7394b8' },
    { id: 'region-national', kind: 'region', code: 'REGION', label: '지역', primary: '전국 17개 시·도', secondary: '지역별 주문 비중 · 주간 변화 +3.1%', accent: '#b99a64' }
  ],
  schemaRows: ['IDENTITY', 'TIME', 'QUANTITY', 'VALUE', 'RELATION', 'STATUS'],
  metrics: [
    { label: '판매 순위', value: 'TOP 01', unit: '상품 기준', level: 0.88, accent: '#668cff' },
    { label: '주문 추이', value: '+12.8%', unit: '14일 기준', level: 0.74, accent: '#62c6d9' },
    { label: '공급률', value: '68%', unit: '재고 연계', level: 0.68, accent: '#62b899' },
    { label: '판매출고', value: '₩28.5M', unit: '이번 달', level: 0.82, accent: '#d1a65f' }
  ],
  trend: { value: '+12.8%', values: [22, 27, 25, 38, 35, 49, 46, 61, 57, 72, 68, 82] },
  reports: [
    { code: 'R-01', label: '판매 순위', meta: 'PRODUCT × SALES' },
    { code: 'R-02', label: '재고 현황', meta: 'STOCK × ORDER' },
    { code: 'R-03', label: '지역별 주문', meta: 'REGION × ORDER' }
  ],
  kimi: {
    copy: '주문 증가와 공급률 변화가 동일한 상품군에서 함께 관측됩니다.',
    sources: '근거 · 상품 · 주문 · 재고 · 매출'
  },
  dashboard: {
    dataHubUrl: '',
    metrics: [
      { label: '가용 재고 상품', value: '487,632' },
      { label: '출고 수량', value: '186,420' },
      { label: '발주 수량', value: '91,224' },
      { label: '공급률', value: '68%' }
    ]
  }
};
