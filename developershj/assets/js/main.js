/* ============================================================
   YES24 Developer Portal - Common JavaScript
   ============================================================ */

/* ---------- Session Management ---------- */
const SESSION_KEY = 'dev_portal_session';

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function setSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function escapeHtmlText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

/* ---------- Nav Auth ---------- */
function initNavAuth() {
  const session = getSession();
  const loginBtn = document.getElementById('nav-login-btn');
  const userInfo = document.getElementById('nav-user-info');
  const applyBtn = document.getElementById('nav-apply-btn');

  if (!loginBtn) return;

  if (session) {
    loginBtn.style.display = 'none';
    if (applyBtn) applyBtn.style.display = 'none';
    if (userInfo) {
      const email = escapeHtmlText(session.email);
      const initial = escapeHtmlText(session.email.charAt(0).toUpperCase());
      const profileClass = location.pathname.endsWith('my-applications.html') ? 'nav-profile-link active' : 'nav-profile-link';
      userInfo.innerHTML =
        `<a href="my-applications.html" class="${profileClass}" aria-label="내 애플리케이션으로 이동">` +
        `<span class="nav-profile-avatar">${initial}</span>` +
        `<span class="nav-profile-email">${email}</span>` +
        `</a>` +
        `<button class="btn btn-ghost btn-sm" id="nav-logout-btn">로그아웃</button>`;
      userInfo.style.display = 'flex';
      document.getElementById('nav-logout-btn').addEventListener('click', () => {
        clearSession();
        window.location.reload();
      });
    }
  } else {
    loginBtn.href = 'login.html';
    loginBtn.style.display = '';
    if (applyBtn) applyBtn.style.display = '';
    if (userInfo) userInfo.style.display = 'none';
  }
}

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
  const tocPanel = document.querySelector('.toc-panel');
  if (tocPanel?.dataset.tocInitialized === 'true') return;
  if (tocPanel) tocPanel.dataset.tocInitialized = 'true';

  const targets = Array.from(tocLinks)
    .map(link => {
      const id = (link.getAttribute('href') || '').replace('#', '');
      const target = id ? document.getElementById(id) : null;
      return target ? { id, target } : null;
    })
    .filter(Boolean);
  const navHeight = 60;
  let forcedActiveUntil = 0;

  function setActive(id, force = false) {
    tocLinks.forEach(a => a.classList.remove('active'));
    const active = document.querySelector(`.toc-nav a[href="#${id}"]`);
    if (active) active.classList.add('active');
    if (force) forcedActiveUntil = Date.now() + 700;
  }

  function scrollToTarget(id) {
    const item = targets.find(target => target.id === id);
    if (!item) return;
    const top = item.target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    history.pushState(null, '', `#${id}`);
    window.dispatchEvent(new Event('hashchange'));
    setActive(id, true);
  }

  function onScroll() {
    if (!targets.length) return;
    if (Date.now() < forcedActiveUntil) return;
    const scrollY = window.scrollY + navHeight + 20;
    let current = targets[0];
    targets.forEach(item => {
      if (item.target.offsetTop <= scrollY) current = item;
    });
    if (current) setActive(current.id);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (id && targets.some(item => item.id === id)) setActive(id, true);
  });
  tocLinks.forEach(link => {
    link.addEventListener('click', event => {
      const id = (link.getAttribute('href') || '').replace('#', '');
      if (!id) return;
      event.preventDefault();
      scrollToTarget(id);
    });
  });
  if (location.hash) {
    const id = location.hash.replace('#', '');
    if (targets.some(item => item.id === id)) {
      requestAnimationFrame(() => scrollToTarget(id));
    } else {
      requestAnimationFrame(onScroll);
    }
  } else {
    onScroll();
  }
}

// Sidebar active link
function initSidebarActiveLink() {
  const path = location.pathname.split('/').pop() || 'index.html';
  const sidebarLinks = document.querySelectorAll('.sidebar-nav a');

  function normalizeUrl(href) {
    try {
      return new URL(href, location.href);
    } catch {
      return null;
    }
  }

  function updateSidebarActive() {
    const currentHash = location.hash || '';
    sidebarLinks.forEach(link => {
      const url = normalizeUrl(link.getAttribute('href') || '');
      const linkPath = url?.pathname.split('/').pop() || '';
      const samePage = linkPath === path || (!linkPath && path === 'index.html');
      const hashMatches = url?.hash && url.hash === currentHash;
      const pageMatches = samePage && !url?.hash && !currentHash;
      link.classList.toggle('active', Boolean(samePage && (hashMatches || pageMatches)));
    });
  }

  updateSidebarActive();
  window.addEventListener('hashchange', updateSidebarActive);
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(updateSidebarActive, 0);
    });
  });

  document.querySelectorAll('.myapp-nav a, .explorer-endpoint-item').forEach(el => {
    const href = el.getAttribute('href') || el.dataset.href || '';
    if (href && (href === path || href.endsWith(path))) {
      el.classList.add('active');
    }
  });
}

// Collapsible sidebar groups
function initSidebarCollapsibleGroups() {
  document.querySelectorAll('.sidebar-nav > li').forEach((item, index) => {
    const triggerLink = item.querySelector(':scope > a');
    const subNav = item.querySelector(':scope > .sub-nav');
    if (!triggerLink || !subNav || item.dataset.collapsibleReady === '1') return;

    const button = document.createElement('button');
    const label = document.createElement('span');
    const icon = document.createElement('span');
    const controlsId = subNav.id || `sidebar-subnav-${index}`;

    subNav.id = controlsId;
    button.type = 'button';
    button.className = 'sidebar-group-toggle';
    button.setAttribute('aria-controls', controlsId);
    label.textContent = triggerLink.textContent.trim();
    icon.className = 'sidebar-group-icon';
    icon.setAttribute('aria-hidden', 'true');

    button.append(label, icon);
    triggerLink.replaceWith(button);
    item.dataset.collapsibleReady = '1';

    const setExpanded = expanded => {
      button.setAttribute('aria-expanded', String(expanded));
      subNav.hidden = !expanded;
    };

    setExpanded(Boolean(subNav.querySelector('a.active')));
    button.addEventListener('click', () => {
      setExpanded(button.getAttribute('aria-expanded') !== 'true');
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
  initSidebarCollapsibleGroups();
  initMyAppNav();
  initExplorer();
  initNavAuth();
});
