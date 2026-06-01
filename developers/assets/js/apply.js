/* YES24 Developers — apply.html
   Multi-step form validation and conditional add-on fields */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setError(field, msg) {
    var wrap = field.closest('.field');
    if (!wrap) return;
    var err = wrap.querySelector('.err');
    if (msg) {
      wrap.classList.add('has-error');
      if (err) err.textContent = msg;
    } else {
      wrap.classList.remove('has-error');
    }
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function validUrl(v) {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(v);
  }

  function toggleAddon() {
    var on = $('#useAddon').checked;
    var card = $('#useAddonCard');
    var fields = $('#addonFields');
    if (on) {
      fields.classList.remove('hidden');
      card.classList.add('active');
    } else {
      fields.classList.add('hidden');
      card.classList.remove('active');
      // Clear errors on hidden fields
      $$('#addonFields .field').forEach(function (f) { f.classList.remove('has-error'); });
    }
  }

  function generateMockKey() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = 'yes24_live_';
    for (var i = 0; i < 32; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function validateForm() {
    var ok = true;
    // Required fields (always)
    var requireds = [
      { el: '#name', msg: '이름 또는 회사명을 입력해 주세요.' },
      { el: '#email', msg: '이메일을 입력해 주세요.', check: function (v) { return validEmail(v) || '올바른 이메일 형식이 아닙니다.'; } },
      { el: '#purpose', msg: '사용 목적을 작성해 주세요.', check: function (v) { return v.length >= 10 || '사용 목적을 10자 이상 작성해 주세요.'; } },
    ];
    requireds.forEach(function (r) {
      var el = $(r.el);
      var v = (el.value || '').trim();
      if (!v) { setError(el, r.msg); ok = false; return; }
      if (r.check) {
        var res = r.check(v);
        if (res !== true) { setError(el, res); ok = false; return; }
      }
      setError(el, '');
    });

    // App type radio
    var appType = document.querySelector('input[name="appType"]:checked');
    if (!appType) {
      $('#appTypeErr').textContent = '연동 유형을 선택해 주세요.';
      $('#appTypeErr').style.display = 'block';
      ok = false;
    } else {
      $('#appTypeErr').style.display = 'none';
    }

    // Add-on fields if enabled
    if ($('#useAddon').checked) {
      var addonRequired = [
        { el: '#serviceName', msg: '서비스명을 입력해 주세요.' },
        { el: '#serviceUrl', msg: '서비스 URL을 입력해 주세요.', check: function (v) { return validUrl(v) || 'http(s):// 로 시작하는 올바른 URL을 입력해 주세요.'; } },
        { el: '#memberNo', msg: 'YES24 회원번호를 입력해 주세요.', check: function (v) { return /^[0-9]{6,12}$/.test(v) || '회원번호는 6~12자리 숫자여야 합니다.'; } },
      ];
      addonRequired.forEach(function (r) {
        var el = $(r.el);
        var v = (el.value || '').trim();
        if (!v) { setError(el, r.msg); ok = false; return; }
        if (r.check) {
          var res = r.check(v);
          if (res !== true) { setError(el, res); ok = false; return; }
        }
        setError(el, '');
      });

      if (!$('#agreeAddon').checked) {
        $('#agreeAddonErr').textContent = '애드온 이용약관에 동의해 주세요.';
        $('#agreeAddonErr').style.display = 'block';
        ok = false;
      } else {
        $('#agreeAddonErr').style.display = 'none';
      }
    }

    // Required agreements
    if (!$('#agreeTos').checked) {
      $('#agreeTosErr').textContent = 'YES24 Open API 이용약관에 동의해 주세요.';
      $('#agreeTosErr').style.display = 'block';
      ok = false;
    } else {
      $('#agreeTosErr').style.display = 'none';
    }
    if (!$('#agreePrivacy').checked) {
      $('#agreePrivacyErr').textContent = '개인정보 처리방침에 동의해 주세요.';
      $('#agreePrivacyErr').style.display = 'block';
      ok = false;
    } else {
      $('#agreePrivacyErr').style.display = 'none';
    }

    return ok;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      // Scroll to first error
      var first = document.querySelector('.has-error, .err[style*="block"]');
      if (first && first.scrollIntoView) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Simulate submission delay
    var btn = $('#submitBtn');
    var origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '신청 처리 중...';

    setTimeout(function () {
      var key = generateMockKey();
      $('#formSection').classList.add('hidden');
      $('#successSection').classList.remove('hidden');
      $('#issuedKey').textContent = key;
      $('#issuedEmail').textContent = $('#email').value;
      // Indicate add-on enrollment status
      if ($('#useAddon').checked) {
        $('#addonStatusNote').classList.remove('hidden');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 900);
  }

  function copyKey() {
    var k = $('#issuedKey').textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(k).then(function () {
        var b = $('#copyKeyBtn');
        b.textContent = '복사됨!';
        setTimeout(function () { b.textContent = '키 복사'; }, 1400);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('#useAddon').addEventListener('change', toggleAddon);
    $('#applyForm').addEventListener('submit', handleSubmit);
    $('#copyKeyBtn').addEventListener('click', copyKey);

    // Clear errors on input
    $$('input, textarea, select').forEach(function (el) {
      el.addEventListener('input', function () { setError(el, ''); });
      el.addEventListener('change', function () { setError(el, ''); });
    });

    // Estimated daily traffic select live preview
    var tr = $('#trafficLevel');
    if (tr) {
      tr.addEventListener('change', function () {
        var hint = $('#trafficHint');
        var v = tr.value;
        var msg = {
          'low': '월 100,000 호출까지 무료 플랜으로 운영 가능합니다.',
          'mid': '무료 한도를 초과합니다. 사용량 기반 요금제(Pro)가 권장됩니다.',
          'high': '대량 트래픽으로 분류됩니다. 별도 협의(Enterprise)로 안내됩니다.'
        }[v] || '';
        hint.textContent = msg;
      });
    }
  });
})();
