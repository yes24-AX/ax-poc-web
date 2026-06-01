/* YES24 Developers Portal - common JS
   Handles: nav highlight, mobile menu, copy buttons, FAQ toggle, scroll-spy */
(function () {
  'use strict';

  // ---------- Active nav highlight ----------
  function setActiveNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === path) a.classList.add('active');
    });
  }

  // ---------- Mobile menu toggle ----------
  function setupMobileNav() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    // Close on link click
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') nav.classList.remove('open');
    });
  }

  // ---------- Year in footer ----------
  function setYear() {
    var el = document.querySelector('[data-year]');
    if (el) el.textContent = new Date().getFullYear();
  }

  // ---------- Copy-to-clipboard for code blocks ----------
  function setupCopyButtons() {
    document.querySelectorAll('.codeblock').forEach(function (block) {
      // Avoid duplicates if hot-reloaded
      if (block.querySelector('.copy-btn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', function () {
        // Copy the currently visible <pre>
        var pre = block.querySelector('pre:not(.hidden)');
        if (!pre) return;
        var text = pre.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function () {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 1500);
          });
        } else {
          // Fallback
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          document.body.removeChild(ta);
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        }
      });
      block.appendChild(btn);
    });
  }

  // ---------- Codeblock language tabs ----------
  function setupCodeTabs() {
    document.querySelectorAll('.codeblock').forEach(function (block) {
      var tabs = block.querySelectorAll('.codeblock-tabs button');
      var pres = block.querySelectorAll('pre');
      if (tabs.length === 0) return;
      tabs.forEach(function (tab, idx) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          pres.forEach(function (p) { p.classList.add('hidden'); });
          tab.classList.add('active');
          if (pres[idx]) pres[idx].classList.remove('hidden');
        });
      });
    });
  }

  // ---------- FAQ accordion ----------
  function setupFaq() {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var q = item.querySelector('.faq-q');
      if (!q) return;
      q.addEventListener('click', function () {
        item.classList.toggle('open');
      });
    });
    // Category filter
    var cats = document.querySelectorAll('.faq-cats button');
    cats.forEach(function (btn) {
      btn.addEventListener('click', function () {
        cats.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.getAttribute('data-cat');
        document.querySelectorAll('.faq-item').forEach(function (item) {
          var c = item.getAttribute('data-cat');
          if (cat === 'all' || c === cat) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
            item.classList.remove('open');
          }
        });
      });
    });
  }

  // ---------- Scroll-spy for docs side nav ----------
  function setupScrollSpy() {
    var links = document.querySelectorAll('.docs-side a[href^="#"]');
    if (links.length === 0) return;
    var sections = [];
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (sec) sections.push({ id: id, el: sec, link: a });
    });
    function onScroll() {
      var offset = (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64) + 40;
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        var r = sections[i].el.getBoundingClientRect();
        if (r.top - offset <= 0) current = sections[i];
      }
      links.forEach(function (l) { l.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    setActiveNav();
    setupMobileNav();
    setYear();
    setupCopyButtons();
    setupCodeTabs();
    setupFaq();
    setupScrollSpy();
  });
})();
