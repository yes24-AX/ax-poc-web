/* 도서·외서 샘플 데이터 생성기
 * 원천 데이터가 연결되기 전까지 화면 구성을 확인하기 위한 가상 수치다. 실제 실적이 아니다.
 * eBook 실데이터(data-ebook.js)와 같은 스키마로 만들어 대시보드 코드가 대분류와 무관하게 동작하게 한다.
 * 시드 고정 PRNG라 새로고침해도 같은 값이 나온다.
 */
(function () {
  const EL = 21;
  const wd = d => new Date(2026, 8, d).getDay();
  const isWE = d => { const w = wd(d); return w === 0 || w === 6; };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r10 = v => Math.round(v / 10) * 10;
  const r1 = v => Math.round(v * 10) / 10;

  function build(cfg) {
    const rnd = mulberry32(cfg.seed);
    const rows = [];
    for (let d = 1; d <= EL; d++) {
      const f = (isWE(d) ? cfg.we : 1) * (0.86 + 0.28 * rnd()) * (d <= 3 ? 1.08 : 1);
      const s = r10(cfg.base * f);
      const yoy = r1(cfg.yoy + (rnd() - 0.5) * 22);
      const cp = Math.round(s * (cfg.cp + 0.015 * rnd() + (isWE(d) ? 0.01 : 0)));
      const gv = Math.round(s * (cfg.gv + 0.008 * rnd() + (isWE(d) ? 0.008 : 0)));
      rows.push({ d, s, yoy, net: s - cp - gv, cp, gv });
    }
    const cum = rows.reduce((a, r) => a + r.s, 0);
    const ly = Math.round(rows.reduce((a, r) => a + r.s / (1 + r.yoy / 100), 0));
    const cpT = rows.reduce((a, r) => a + r.cp, 0), gvT = rows.reduce((a, r) => a + r.gv, 0);
    const seg = { total: { cum, ly, yoy: r1((cum / ly - 1) * 100), net: cum - cpT - gvT, cp: cpT, gv: gvT, rows } };

    /* 분야: 가중치 → 누적 매출 배분 (합계가 정확히 cum이 되도록 마지막 분야에서 보정) */
    const flat = [];
    cfg.pds.forEach((p, pi) => p.cats.forEach(c => flat.push({ pi, name: c[0], w: c[1] * (0.9 + 0.2 * rnd()), unit: c[2] })));
    const wsum = flat.reduce((a, c) => a + c.w, 0);
    let acc = 0;
    flat.forEach((c, i) => {
      c.s = i === flat.length - 1 ? cum - acc : r10(cum * c.w / wsum);
      acc += c.s;
      c.yoy = r1(cfg.yoy + (rnd() - 0.5) * 34);
      c.ly = c.s / (1 + c.yoy / 100);
    });
    const cats = flat.map(c => ({ name: c.name, s: c.s, yoy: c.yoy, share: r1(c.s / cum * 100), unit: Math.round(c.unit * (0.9 + 0.2 * rnd())), cnt: 0 }))
      .map(c => ({ ...c, cnt: Math.round(c.s / c.unit) }))
      .sort((a, b) => b.s - a.s);

    /* PD(파트): 담당 분야 합 = 파트 실적 */
    const pd = cfg.pds.map((p, pi) => {
      const mine = flat.filter(c => c.pi === pi);
      const cy = mine.reduce((a, c) => a + c.s, 0);
      const lyP = Math.round(mine.reduce((a, c) => a + c.ly, 0));
      const target = Math.round(lyP / EL * 30 * (1.02 + 0.1 * rnd()) / 1e6) * 1e6;
      return { pd: p.name, field: p.field, target, ly: lyP, cy };
    });

    /* 파트별 일별: 일매출을 파트 비중(±노이즈)으로 나누고 마지막 파트에서 보정 */
    const share = pd.map(p => p.cy / cum);
    const pdDaily = rows.map(r => {
      const w = share.map(s => s * (0.88 + 0.24 * rnd()));
      const ws = w.reduce((a, b) => a + b, 0);
      let left = r.s;
      const parts = w.map((x, i) => { if (i === w.length - 1) return left; const v = r10(r.s * x / ws); left -= v; return v; });
      return [r.d, ...parts];
    });
    /* 파트별 누적이 일별 합과 일치하도록 cy 재계산 */
    pd.forEach((p, i) => { p.cy = pdDaily.reduce((a, row) => a + row[i + 1], 0); });

    /* 상위 상품: 자리표시용 샘플 */
    const products = [];
    cfg.pds.forEach((p, pi) => {
      const mine = flat.filter(c => c.pi === pi);
      let amt = Math.round(p.top * (0.9 + 0.2 * rnd()));
      for (let i = 1; i <= 12; i++) {
        const c = mine[i % mine.length];
        const price = Math.round((c.unit * (0.7 + 0.8 * rnd())) / 100) * 100;
        const qty = Math.max(1, Math.round(amt / price));
        products.push({ pd: p.name, group: p.field, id: String(cfg.seed * 1000 + pi * 100 + i), title: `[샘플] ${c.name} 대표 상품 ${String(i).padStart(2, '0')}`, cat: c.name, maker: '샘플 출판사', price, qty, amt: price * qty });
        amt = Math.round(amt * (0.78 + 0.12 * rnd()));
      }
    });

    /* 쿠폰·상품권: 파트 비중으로 배분하고 파트당 캠페인 2~3개로 쪼갬 */
    function promo(total, kind) {
      const byPd = [], detail = [];
      let left = total;
      pd.forEach((p, i) => {
        const amt = i === pd.length - 1 ? left : Math.round(total * share[i] * (0.7 + 0.6 * rnd()));
        left -= amt;
        byPd.push({ pd: p.pd, field: p.field, amt });
        const n = 2 + Math.floor(rnd() * 2);
        let rest = amt;
        for (let k = 0; k < n; k++) {
          const a = k === n - 1 ? rest : Math.round(rest * (0.45 + 0.2 * rnd()));
          rest -= a;
          detail.push({ id: String(cfg.seed * 100 + i * 10 + k + (kind === 'coupon' ? 0 : 5)), name: `[샘플] ${p.field.split('/')[0]} ${kind === 'coupon' ? cfg.couponNames[k % cfg.couponNames.length] : cfg.voucherNames[k % cfg.voucherNames.length]}`, pd: p.pd, amt: a });
        }
      });
      byPd.sort((a, b) => b.amt - a.amt);
      return { total, byPd, detail };
    }

    return {
      seg, pd, pdDaily, cats, products,
      coupon: { general: promo(cpT, 'coupon') },
      voucher: { general: promo(gvT, 'voucher') },
    };
  }

  const couponNames = ['10% 할인 쿠폰', '신간 기획전 추가 할인', '2만원 이상 3천원 할인'];
  const voucherNames = ['주말 보너스 상품권', '첫 구매 3천원 상품권', '가을 독서 지원금'];

  window.SAMPLE_DATA = {
    book: build({
      seed: 11, base: 312000000, we: 0.78, yoy: -2, cp: 0.028, gv: 0.006, couponNames, voucherNames,
      pds: [
        { name: '문학 파트', field: '소설/에세이/가정', top: 9e6, cats: [['소설/시/희곡', 14, 15800], ['에세이', 6, 16500], ['가정 살림', 3, 18200], ['건강 취미', 3, 19800], ['여행', 2, 18900]] },
        { name: '경제경영 파트', field: '경제경영/자기계발', top: 8e6, cats: [['경제 경영', 9, 21500], ['자기계발', 7, 17900]] },
        { name: '인문 파트', field: '인문/사회/역사/과학', top: 6e6, cats: [['인문', 6, 19400], ['사회 정치', 4, 20100], ['역사', 4, 21800], ['자연과학', 3, 22600], ['예술', 2, 27500], ['종교', 2, 16200]] },
        { name: '어린이 파트', field: '어린이/유아/청소년', top: 7e6, cats: [['어린이', 8, 14200], ['유아', 5, 13100], ['청소년', 3, 15300], ['만화/라이트노벨', 4, 9800]] },
        { name: '수험·참고서 파트', field: '수험서/참고서/IT/외국어', top: 1.2e7, cats: [['수험서 자격증', 6, 28900], ['초등참고서', 3, 15600], ['중고등참고서', 5, 17200], ['IT 모바일', 3, 29800], ['국어 외국어 사전', 3, 18700], ['대학교재', 2, 31200]] },
      ],
    }),
    foreign: build({
      seed: 23, base: 24300000, we: 0.86, yoy: 4, cp: 0.022, gv: 0.004, couponNames, voucherNames,
      pds: [
        { name: '영미 파트', field: '영미도서', top: 1.1e6, cats: [['영미 문학', 12, 24800], ['영미 인문/경제', 8, 31500], ['영미 아트/디자인', 4, 46200]] },
        { name: '어린이원서 파트', field: '어린이원서/ELT', top: 1.4e6, cats: [['어린이 원서', 14, 19600], ['ELT/사전', 9, 23400]] },
        { name: '일본·기타 파트', field: '일본/중국/해외잡지', top: 9e5, cats: [['일본 도서', 10, 17800], ['일본 만화/라노벨', 6, 8900], ['중국/기타 도서', 3, 21000], ['해외잡지', 3, 15400]] },
      ],
    }),
  };
})();
