/* ============================================================
   YES24 Developer Portal - Common JavaScript
   ============================================================ */

// Active nav link
(function () {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || (path === 'index.html' && href === './') || href === path.replace('.html', '')) {
      a.classList.add('active');
    }
  });
})();

// Copy button
function initCopyButtons() {
  document.querySelectorAll('.copy-btn, .tab-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let text = '';
      const target = btn.dataset.target;
      if (target) {
        const el = document.querySelector(target);
        text = el ? el.textContent : '';
      } else {
        const pre = btn.closest('.code-block, .code-tabs')?.querySelector('pre');
        if (pre) text = pre.textContent;
      }
      navigator.clipboard.writeText(text.trim()).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

// Code Tabs
function initCodeTabs() {
  document.querySelectorAll('.code-tabs').forEach(tabs => {
    const buttons = tabs.querySelectorAll('.code-tab-nav button:not(.tab-copy-btn)');
    const panels = tabs.querySelectorAll('.code-tab-panel');
    const copyBtn = tabs.querySelector('.tab-copy-btn');

    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        panels[i]?.classList.add('active');
      });
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const activePanel = tabs.querySelector('.code-tab-panel.active');
        const text = activePanel?.querySelector('pre')?.textContent || '';
        navigator.clipboard.writeText(text.trim()).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '✓ Copied';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
        });
      });
    }
  });
}

// TOC scroll tracking
function initTocTracking() {
  const tocLinks = document.querySelectorAll('.toc-nav a');
  if (!tocLinks.length) return;

  const headings = Array.from(document.querySelectorAll('.doc-content h2, .doc-content h3'));
  const navHeight = 60;

  function onScroll() {
    const scrollY = window.scrollY + navHeight + 20;
    let current = headings[0];
    headings.forEach(h => {
      if (h.offsetTop <= scrollY) current = h;
    });

    tocLinks.forEach(a => a.classList.remove('active'));
    if (current) {
      const id = current.getAttribute('id');
      const active = document.querySelector(`.toc-nav a[href="#${id}"]`);
      if (active) active.classList.add('active');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Sidebar active link
function initSidebarActiveLink() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-nav a, .myapp-nav a, .explorer-endpoint-item').forEach(el => {
    const href = el.getAttribute('href') || el.dataset.href || '';
    if (href && (href === path || href.endsWith(path))) {
      el.classList.add('active');
    }
  });
}

// Key reveal button
function initKeyReveal() {
  document.querySelectorAll('.key-reveal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const valueEl = btn.closest('.key-value');
      const span = valueEl?.querySelector('.key-text');
      if (!span) return;
      if (span.dataset.revealed === '1') {
        span.textContent = span.dataset.masked;
        span.dataset.revealed = '0';
        btn.textContent = '👁';
      } else {
        span.textContent = span.dataset.real;
        span.dataset.revealed = '1';
        btn.textContent = '🙈';
      }
    });
  });
}

// My App tab navigation (spa-lite)
function initMyAppNav() {
  document.querySelectorAll('.myapp-nav a[data-panel]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const panelId = link.dataset.panel;
      document.querySelectorAll('.myapp-nav a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.myapp-panel').forEach(p => p.classList.add('hidden'));
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');
    });
  });
}

// Explorer endpoint selection
function initExplorer() {
  document.querySelectorAll('.explorer-endpoint-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.explorer-endpoint-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// Initialize all
document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initCodeTabs();
  initTocTracking();
  initSidebarActiveLink();
  initKeyReveal();
  initMyAppNav();
  initExplorer();
});
