/**
 * Optician's Desk — Shared UI Components
 * Include this script on every page:
 *   <script src="js/components.js"></script>  (from root)
 *   <script src="../js/components.js"></script> (from subdirectory)
 *
 * Add these elements to your HTML where you want them injected:
 *   <div id="odb-header"></div>
 *   <div id="odb-footer"></div>
 */

(function () {

  function init() {
    /* ── Detect path depth for relative links ── */
    const inSubdir = window.location.pathname.split('/').filter(Boolean).length > 1;
    const root = inSubdir ? '../' : '';

    /* ── Inject shared CSS ── */
    const style = document.createElement('style');
    style.textContent = `
      .odb-header {
        background: #1a2e26;
        position: sticky;
        top: 0;
        z-index: 50;
        box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.18);
      }
      .odb-header__inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 32px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }
      .odb-brand {
        font-family: 'DM Serif Display', Georgia, serif;
        font-size: 1.15rem;
        color: #fff;
        text-decoration: none;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
      .odb-brand span {
        color: rgba(255,255,255,0.4);
        font-family: 'DM Sans', sans-serif;
        font-size: 0.75rem;
        font-weight: 400;
        margin-left: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .odb-nav {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .odb-nav a {
        color: rgba(255,255,255,0.6);
        text-decoration: none;
        font-size: 0.88rem;
        font-weight: 500;
        padding: 6px 14px;
        border-radius: 8px;
        transition: color 0.15s, background 0.15s;
      }
      .odb-nav a:hover  { color: #fff; background: rgba(255,255,255,0.08); }
      .odb-nav a.active { color: #fff; background: rgba(255,255,255,0.12); }
      .dark-btn {
        margin-left: 8px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.6);
        font-size: 0.82rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: all 0.15s;
      }
      .dark-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .dark-btn-signout {
        margin-left: 2px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.5);
        font-size: 0.82rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: all 0.15s;
      }
      .dark-btn-signout:hover { background: rgba(255,100,100,0.12); color: #ff9999; border-color: rgba(255,100,100,0.25); }

      /* ── Hamburger button ── */
      .odb-hamburger {
        display: none;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px;
      }

      .odb-hamburger span {
        display: block;
        width: 22px;
        height: 2px;
        background: rgba(255,255,255,0.7);
        border-radius: 2px;
        transition: all 0.2s;
      }

      .odb-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .odb-hamburger.open span:nth-child(2) { opacity: 0; }
      .odb-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

      /* ── Mobile nav dropdown ── */
      .odb-mobile-nav {
        display: none;
        flex-direction: column;
        background: #162820;
        border-top: 1px solid rgba(255,255,255,0.06);
        padding: 8px 16px 16px;
        gap: 4px;
      }

      .odb-mobile-nav.open { display: flex; }

      .odb-mobile-nav a {
        color: rgba(255,255,255,0.7);
        text-decoration: none;
        font-size: 0.95rem;
        font-weight: 500;
        padding: 10px 12px;
        border-radius: 8px;
        transition: color 0.15s, background 0.15s;
        font-family: 'DM Sans', sans-serif;
      }

      .odb-mobile-nav a:hover  { color: #fff; background: rgba(255,255,255,0.08); }
      .odb-mobile-nav a.active { color: #fff; background: rgba(255,255,255,0.12); }

      .dark-btn-mobile {
        margin-top: 4px;
        padding: 10px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: transparent;
        color: rgba(255,255,255,0.6);
        font-size: 0.88rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
        width: 100%;
      }

      .dark-btn-mobile:hover { background: rgba(255,255,255,0.08); color: #fff; }

      @media (max-width: 640px) {
        .odb-nav        { display: none; }
        .odb-hamburger  { display: flex; }
      }
      .odb-footer {
        margin-top: 64px;
        border-top: 1px solid rgba(0,0,0,0.07);
        padding: 24px 32px;
        text-align: center;
      }
      .odb-footer p {
        font-size: 0.82rem;
        color: #9aaba5;
        margin: 0;
      }
      body.dark .odb-footer p { color: #3d5248; }

      /* ── Global dark mode for calculator pages ── */
      body.dark { background: #111916; color: #d8e4df; }
      body.dark .calc-title h1       { color: #c8ddd6; }
      body.dark .calc-title p        { color: #7a9488; }
      body.dark .calc-title__eyebrow { color: #5f776c; }
      body.dark .breadcrumb          { color: #5f776c; }
      body.dark .breadcrumb a        { color: #5f776c; }
      body.dark .calc-card           { background: #1c2620; border-color: #263028; box-shadow: 0 6px 18px rgba(0,0,0,0.3); }
      body.dark .calc-card__title    { color: #5f776c; }
      body.dark .field label         { color: #7a9488; }
      body.dark .field input,
      body.dark .field select        { background: #222e28; border-color: #2e3c36; color: #d8e4df; }
      body.dark .field .hint         { color: #4d6860; }
      body.dark .check-label         { color: #7a9488; }
      body.dark .output-card         { background: #222e28; border-color: #2e3c36; }
      body.dark .output-card__label  { color: #5f776c; }
      body.dark .output-card__rx     { color: #c8ddd6; }
      body.dark .copy-btn            { background: #1c2620; border-color: #2e3c36; color: #7fa898; }
      body.dark .formula-note        { background: #1c2620; color: #7a9488; }
      body.dark .formula-note strong { color: #a8c4bc; }
      body.dark .guidance-card       { background: #1c2620; border-color: #263028; color: #7a9488; }
      body.dark .guidance-card__label { color: #5f776c; }
      body.dark .guidance-card strong { color: #a8c4bc; }
      body.dark .output-result       { background: #0f1e18; }
      body.dark .mode-toggle         { background: #1c2620; }
      body.dark .mode-toggle__btn    { color: #7a9488; }
      body.dark .mode-toggle__btn.active { background: #263028; color: #c8ddd6; }
      body.dark .working-step,
      body.dark .output-step,
      body.dark .boundary-card,
      body.dark .step-card           { background: #1c2620; border-color: #263028; }
      body.dark .working-step__label,
      body.dark .output-step__label,
      body.dark .step-card__label    { color: #5f776c; }
      body.dark .working-step__val,
      body.dark .output-step__val,
      body.dark .step-card__val      { color: #c8ddd6; }
      body.dark .working-step__sub,
      body.dark .output-step__working,
      body.dark .step-card__working  { color: #5f776c; }
    `;
    document.head.appendChild(style);

    /* ── Active nav link ── */
    function isActive(href) {
      const path = window.location.pathname;
      // Match by full path suffix to avoid index.html clashing across directories
      if (href === 'index.html') {
        // Only highlight Home when at root index, not calculators/index.html
        return (path === '/' || path === '/index.html') ? 'active' : '';
      }
      if (href === 'lenses.html') {
        return path.endsWith('/lenses.html') ? 'active' : '';
      }
      return path.endsWith(href) ? 'active' : '';
    }

    /* ── Active Calculators link ── */
    function isCalcActive() {
      return window.location.pathname.includes('/calculators/') ? 'active' : '';
    }

    /* ── Header HTML ── */
    const headerHTML = `
      <header class="odb-header">
        <div class="odb-header__inner">
          <a class="odb-brand" href="${root}index.html">Optician's Desk <span>NZ</span></a>
          <nav class="odb-nav">
            <a href="${root}index.html" class="${isActive('index.html')}">Home</a>
            <a href="${root}lenses.html" class="${isActive('lenses.html')}">Lens Database</a>
            <a href="${root}calculators/index.html" class="${isCalcActive()}">Calculators</a>
            <a href="/login" id="nav-login">Log in</a>
            <a href="/account" id="nav-account" style="display:none">My Account</a>
            <button class="dark-btn-signout" id="nav-signout" style="display:none" onclick="ODB.signOut()">Sign out</button>
            <button class="dark-btn" id="dark-toggle" onclick="ODB.toggleDark()">Night Mode</button>
          </nav>
          <button class="odb-hamburger" id="odb-hamburger" onclick="ODB.toggleNav()" aria-label="Toggle menu">
            <span></span><span></span><span></span>
          </button>
        </div>
        <div class="odb-mobile-nav" id="odb-mobile-nav">
          <a href="${root}index.html" class="${isActive('index.html')}">Home</a>
          <a href="${root}lenses.html" class="${isActive('lenses.html')}">Lens Database</a>
          <a href="${root}calculators/index.html" class="${isCalcActive()}">Calculators</a>
          <a href="/login" id="mob-login">Log in</a>
          <a href="/account" id="mob-account" style="display:none">My Account</a>
          <button class="dark-btn-mobile" id="mob-signout" style="display:none" onclick="ODB.signOut()">Sign out</button>
          <button class="dark-btn-mobile" id="dark-toggle-mobile" onclick="ODB.toggleDark()">Night Mode</button>
        </div>
      </header>
    `;

    /* ── Footer HTML ── */
    const footerHTML = `
      <footer class="odb-footer">
        <p>Optician's Desk — built for NZ optical dispensing</p>
      </footer>
    `;

    /* ── Inject header ── */
    const headerEl = document.getElementById('odb-header');
    if (headerEl) headerEl.outerHTML = headerHTML;

    /* ── Inject footer ── */
    const footerEl = document.getElementById('odb-footer');
    if (footerEl) footerEl.outerHTML = footerHTML;

    /* ── Apply saved dark mode ── */
    if (localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark');
      const btn1 = document.getElementById('dark-toggle');
      const btn2 = document.getElementById('dark-toggle-mobile');
      if (btn1) btn1.textContent = 'Day Mode';
      if (btn2) btn2.textContent = 'Day Mode';
    }

    /* ── Auth-aware nav ── */
    // Ping a protected endpoint to check login state.
    // Swap "Log in" for "My Account" if user is authenticated.
    fetch('/api/lenses', { method: 'HEAD' })
      .then(res => {
        if (res.status !== 401) {
          const navLogin   = document.getElementById('nav-login');
          const navAccount = document.getElementById('nav-account');
          const mobLogin   = document.getElementById('mob-login');
          const mobAccount = document.getElementById('mob-account');
          if (navLogin)   navLogin.style.display   = 'none';
          if (navAccount) navAccount.style.display = '';
          if (mobLogin)   mobLogin.style.display   = 'none';
          if (mobAccount) mobAccount.style.display = '';
          const navSignout = document.getElementById('nav-signout');
          const mobSignout = document.getElementById('mob-signout');
          if (navSignout) navSignout.style.display = '';
          if (mobSignout) mobSignout.style.display = '';
        }
      })
      .catch(() => {}); // fail silently — default shows Log in
  }

  /* ── Dark mode toggle (global) ── */
  window.ODB = {
    toggleDark() {
      const dark = document.body.classList.toggle('dark');
      const label = dark ? 'Day Mode' : 'Night Mode';
      const btn1 = document.getElementById('dark-toggle');
      const btn2 = document.getElementById('dark-toggle-mobile');
      if (btn1) btn1.textContent = label;
      if (btn2) btn2.textContent = label;
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    },
    toggleNav() {
      const nav  = document.getElementById('odb-mobile-nav');
      const btn  = document.getElementById('odb-hamburger');
      if (nav) nav.classList.toggle('open');
      if (btn) btn.classList.toggle('open');
    },
    signOut() {
      fetch('/auth/logout', { method: 'POST' })
        .then(() => { window.location.href = '/login'; })
        .catch(() => { window.location.href = '/login'; });
    }
  };

  /* ── Run after DOM is ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
