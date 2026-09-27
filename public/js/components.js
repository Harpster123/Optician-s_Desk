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
    /* ── All nav links are absolute (/lenses, /calculators/…) so they work from any page ── */

    /* ── Inject shared CSS ── */
    const style = document.createElement('style');
    style.textContent = `
      .odb-dev-banner {
        background: #2a3d34;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        padding: 6px 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: sticky;
        top: 0;
        z-index: 51;
      }
      .odb-dev-banner__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #5f776c;
        flex-shrink: 0;
        animation: odb-pulse 2.4s ease-in-out infinite;
      }
      .odb-dev-banner p {
        font-size: 0.72rem;
        font-weight: 500;
        letter-spacing: 0.05em;
        color: rgba(255,255,255,0.38);
        margin: 0;
        font-family: 'DM Sans', sans-serif;
      }
      .odb-dev-banner p strong {
        color: rgba(255,255,255,0.55);
        font-weight: 600;
      }
      @keyframes odb-pulse {
        0%, 100% { opacity: 0.4; }
        50%       { opacity: 1; }
      }
      body.dark .odb-dev-banner {
        background: #111916;
        border-bottom-color: rgba(255,255,255,0.04);
      }
      .odb-header {
        background: #1a2e26;
        position: sticky;
        top: 31px;
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
      /* ── Footer ── */
      .odb-footer {
        margin-top: 64px;
        border-top: 1px solid rgba(0,0,0,0.07);
        background: #f0f3f1;
      }
      body.dark .odb-footer { background: #111916; border-top-color: rgba(255,255,255,0.06); }

      .odb-footer__inner {
        max-width: 1280px;
        margin: 0 auto;
        padding: 32px 32px 24px;
      }

      /* Tab row */
      .odb-footer__tabs {
        display: flex;
        align-items: center;
        gap: 0;
        margin-bottom: 0;
        border-bottom: 1px solid rgba(0,0,0,0.07);
        flex-wrap: wrap;
      }
      body.dark .odb-footer__tabs { border-bottom-color: rgba(255,255,255,0.07); }

      .odb-footer__tab {
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #9aaba5;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        padding: 10px 18px 10px 0;
        margin-bottom: -1px;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        transition: color 0.15s, border-color 0.15s;
      }
      .odb-footer__tab:hover { color: #5f776c; }
      .odb-footer__tab.active { color: #1a2e26; border-bottom-color: #5f776c; }
      body.dark .odb-footer__tab { color: #3d5248; }
      body.dark .odb-footer__tab:hover { color: #7a9488; }
      body.dark .odb-footer__tab.active { color: #c8ddd6; border-bottom-color: #5f776c; }

      .odb-footer__copy {
        font-size: 0.75rem;
        color: #b0bdb9;
        margin-left: auto;
        padding-bottom: 10px;
        font-family: 'DM Sans', sans-serif;
      }
      body.dark .odb-footer__copy { color: #3d5248; }

      /* Panels */
      .odb-footer__panel { display: none; padding: 28px 0 8px; }
      .odb-footer__panel.active { display: block; }

      /* Doc styles */
      .odb-footer__updated {
        font-size: 0.72rem;
        letter-spacing: 0.05em;
        color: #b0bdb9;
        margin-bottom: 20px;
        font-family: 'DM Sans', sans-serif;
      }
      body.dark .odb-footer__updated { color: #3d5248; }

      .odb-footer__doc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 24px 40px;
      }

      .odb-footer__doc-section h3 {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #2f4a3e;
        margin: 0 0 6px;
      }
      body.dark .odb-footer__doc-section h3 { color: #5f776c; }

      .odb-footer__doc-section p,
      .odb-footer__doc-section ul {
        font-size: 0.82rem;
        color: #4a5450;
        line-height: 1.7;
        margin: 0;
      }
      body.dark .odb-footer__doc-section p,
      body.dark .odb-footer__doc-section ul { color: #7a9488; }

      .odb-footer__doc-section ul { padding-left: 1.1rem; }
      .odb-footer__doc-section ul li { margin-bottom: 3px; }
      .odb-footer__doc-section a { color: #5f776c; }
      body.dark .odb-footer__doc-section a { color: #7a9488; }

      /* Feedback form */
      .odb-footer__form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        max-width: 640px;
      }
      @media (max-width: 560px) { .odb-footer__form-grid { grid-template-columns: 1fr; } }

      .odb-footer__field { display: flex; flex-direction: column; gap: 5px; }
      .odb-footer__field.full { grid-column: 1 / -1; }

      .odb-footer__field label {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #9aaba5;
        font-family: 'DM Sans', sans-serif;
      }
      body.dark .odb-footer__field label { color: #3d5248; }

      .odb-footer__field input,
      .odb-footer__field select,
      .odb-footer__field textarea {
        font-size: 0.88rem;
        font-family: 'DM Sans', sans-serif;
        padding: 9px 12px;
        border: 1px solid rgba(0,0,0,0.10);
        border-radius: 10px;
        background: #fff;
        color: #1a1f1c;
        outline: none;
        transition: border-color 0.15s;
      }
      .odb-footer__field input:focus,
      .odb-footer__field select:focus,
      .odb-footer__field textarea:focus { border-color: #5f776c; }
      .odb-footer__field textarea { resize: vertical; min-height: 88px; line-height: 1.6; }

      body.dark .odb-footer__field input,
      body.dark .odb-footer__field select,
      body.dark .odb-footer__field textarea {
        background: #1c2620;
        border-color: #263028;
        color: #d8e4df;
      }
      body.dark .odb-footer__field input:focus,
      body.dark .odb-footer__field select:focus,
      body.dark .odb-footer__field textarea:focus { border-color: #5f776c; }

      .odb-footer__char {
        font-size: 0.7rem;
        color: #b0bdb9;
        text-align: right;
        font-family: 'DM Sans', sans-serif;
      }

      .odb-footer__rating-row { display: flex; gap: 6px; }
      .odb-footer__rating-row button {
        width: 34px; height: 34px;
        border: 1px solid rgba(0,0,0,0.10);
        border-radius: 8px;
        background: #fff;
        color: #9aaba5;
        font-size: 0.82rem;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: all 0.1s;
      }
      .odb-footer__rating-row button:hover { border-color: #5f776c; color: #5f776c; }
      .odb-footer__rating-row button.selected { background: #2f4a3e; border-color: #2f4a3e; color: #fff; }
      body.dark .odb-footer__rating-row button { background: #1c2620; border-color: #263028; color: #3d5248; }
      body.dark .odb-footer__rating-row button.selected { background: #2f4a3e; border-color: #2f4a3e; color: #fff; }

      .odb-footer__actions {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 16px;
        grid-column: 1 / -1;
      }

      .odb-footer__submit {
        padding: 9px 22px;
        border-radius: 10px;
        border: none;
        background: #2f4a3e;
        color: #fff;
        font-size: 0.85rem;
        font-weight: 600;
        font-family: 'DM Sans', sans-serif;
        cursor: pointer;
        transition: background 0.15s;
      }
      .odb-footer__submit:hover { background: #1a2e26; }
      .odb-footer__submit:active { transform: scale(0.98); }

      .odb-footer__form-note {
        font-size: 0.75rem;
        color: #b0bdb9;
        font-family: 'DM Sans', sans-serif;
      }
      body.dark .odb-footer__form-note { color: #3d5248; }

      .odb-footer__success {
        display: none;
        font-size: 0.88rem;
        color: #5f776c;
        padding: 12px 0 4px;
        font-family: 'DM Sans', sans-serif;
      }
      .odb-footer__success.show { display: block; }

      /* Bottom bar */
      .odb-footer__bottom {
        margin-top: 28px;
        padding-top: 16px;
        border-top: 1px solid rgba(0,0,0,0.06);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
      }
      body.dark .odb-footer__bottom { border-top-color: rgba(255,255,255,0.05); }

      .odb-footer__bottom p {
        font-size: 0.75rem;
        color: #b0bdb9;
        margin: 0;
        font-family: 'DM Sans', sans-serif;
      }
      body.dark .odb-footer__bottom p { color: #3d5248; }

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

      /* ── Agent Widget ── */
      .odb-agent-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #2f4a3e;
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 4px 20px rgba(0,0,0,0.35);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
      }
      .odb-agent-fab:hover {
        background: #3a5c4e;
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(0,0,0,0.4);
      }
      .odb-agent-fab svg { width: 22px; height: 22px; }

      .odb-agent-widget {
        position: fixed;
        bottom: 90px;
        right: 28px;
        width: 360px;
        max-height: 560px;
        background: #1a2e26;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 16px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        z-index: 998;
        overflow: hidden;
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .odb-agent-widget.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      @media (max-width: 420px) {
        .odb-agent-widget {
          width: calc(100vw - 24px);
          right: 12px;
          bottom: 84px;
        }
        .odb-agent-fab { bottom: 20px; right: 16px; }
      }

      .odb-agent-header {
        padding: 14px 16px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .odb-agent-header__title {
        font-size: 0.82rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
        color: #7a9488;
      }
      .odb-agent-header__sub {
        font-size: 0.72rem;
        color: #7a9488;
        margin-top: 1px;
      }
      .odb-agent-header__close {
        background: transparent;
        border: none;
        color: #3d5248;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        font-size: 1.1rem;
        transition: color 0.1s;
      }
      .odb-agent-header__close:hover { color: #7a9488; }

      .odb-agent-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px 14px 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scrollbar-width: thin;
        scrollbar-color: #2f4a3e transparent;
      }

      .odb-agent-msg {
        max-width: 88%;
        font-size: 0.83rem;
        line-height: 1.55;
        padding: 9px 12px;
        border-radius: 10px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .odb-agent-msg.user {
        align-self: flex-end;
        background: #2f4a3e;
        color: #c8ddd6;
        border-bottom-right-radius: 3px;
      }
      .odb-agent-msg.agent {
        align-self: flex-start;
        background: #1c2e24;
        border: 1px solid rgba(255,255,255,0.06);
        color: #a8c4bc;
        border-bottom-left-radius: 3px;
      }
      .odb-agent-msg.system {
        align-self: center;
        background: transparent;
        color: #9ab5aa;
        font-size: 0.75rem;
        text-align: center;
        padding: 4px 8px;
      }

      .odb-agent-typing {
        align-self: flex-start;
        display: flex;
        gap: 4px;
        padding: 10px 14px;
        background: #1c2e24;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        border-bottom-left-radius: 3px;
      }
      .odb-agent-typing span {
        width: 6px; height: 6px;
        background: #5f776c;
        border-radius: 50%;
        animation: odb-bounce 1.2s ease-in-out infinite;
      }
      .odb-agent-typing span:nth-child(2) { animation-delay: 0.2s; }
      .odb-agent-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes odb-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40%            { transform: translateY(-5px); opacity: 1; }
      }

      .odb-agent-footer {
        padding: 10px 12px 12px;
        border-top: 1px solid rgba(255,255,255,0.06);
        display: flex;
        gap: 8px;
        align-items: flex-end;
        flex-shrink: 0;
      }
      .odb-agent-input {
        flex: 1;
        background: #111916;
        border: 1px solid #263028;
        border-radius: 10px;
        padding: 9px 12px;
        font-size: 0.84rem;
        font-family: 'DM Sans', sans-serif;
        color: #c8ddd6;
        resize: none;
        outline: none;
        line-height: 1.45;
        max-height: 100px;
        overflow-y: auto;
        transition: border-color 0.15s;
      }
      .odb-agent-input::placeholder { color: #3d5248; }
      .odb-agent-input:focus { border-color: #5f776c; }

      .odb-agent-send {
        background: #2f4a3e;
        border: none;
        border-radius: 10px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s;
      }
      .odb-agent-send:hover { background: #3a5c4e; }
      .odb-agent-send:disabled { opacity: 0.4; cursor: not-allowed; }
      .odb-agent-send svg { width: 16px; height: 16px; }

      .odb-agent-gate {
        padding: 24px 18px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .odb-agent-gate p {
        font-size: 0.82rem;
        color: #b8ccc4;
        line-height: 1.55;
        margin: 0;
      }
      .odb-agent-gate a {
        display: inline-block;
        margin-top: 4px;
        padding: 8px 20px;
        background: #2f4a3e;
        color: #c8ddd6;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        text-decoration: none;
        transition: background 0.15s;
      }
      .odb-agent-gate a:hover { background: #3a5c4e; }
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
      if (href === 'lenses') {
        return path === '/lenses' ? 'active' : '';
      }
      return path.endsWith(href) ? 'active' : '';
    }

    /* ── Active Calculators link ── */
    function isCalcActive() {
      return window.location.pathname.includes('/calculators/') ? 'active' : '';
    }

    /* ── Dev banner HTML ── */
    const devBannerHTML = `
      <div class="odb-dev-banner" id="odb-dev-banner">
        <span class="odb-dev-banner__dot"></span>
        <p><strong>Beta</strong> — Optician's Desk is currently in development. Some features may be incomplete.</p>
      </div>
    `;

    /* ── Header HTML ── */
    const headerHTML = `
      <header class="odb-header">
        <div class="odb-header__inner">
          <a class="odb-brand" href="/">Optician's Desk <span>NZ</span></a>
          <nav class="odb-nav">
            <a href="/" class="${isActive('index.html')}">Home</a>
            <a href="/lenses" class="${isActive('lenses')}">Lens Database</a>
            <a href="/calculators/index.html" class="${isCalcActive()}">Calculators</a>
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
          <a href="/" class="${isActive('index.html')}">Home</a>
          <a href="/lenses" class="${isActive('lenses')}">Lens Database</a>
          <a href="/calculators/index.html" class="${isCalcActive()}">Calculators</a>
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
        <div class="odb-footer__inner">

          <div class="odb-footer__tabs">
            <button class="odb-footer__tab" data-tab="disclaimer" onclick="ODB.footerTab('disclaimer')">Disclaimer</button>
            <button class="odb-footer__tab" data-tab="privacy" onclick="ODB.footerTab('privacy')">Privacy policy</button>
            <button class="odb-footer__tab" data-tab="feedback" onclick="ODB.footerTab('feedback')">Feedback</button>
            <span class="odb-footer__copy">&copy; ${new Date().getFullYear()} Optician's Desk</span>
          </div>

          <!-- Disclaimer -->
          <div class="odb-footer__panel" id="odb-panel-disclaimer">
            <p class="odb-footer__updated">Last updated: May 2025</p>
            <div class="odb-footer__doc-grid">
              <div class="odb-footer__doc-section">
                <h3>Clinical use</h3>
                <p>Optician's Desk provides calculators and reference tools to support qualified dispensing opticians. All outputs are indicative only and must be verified by the treating clinician before use in patient care. This tool does not constitute clinical advice and is not a substitute for professional judgement.</p>
              </div>
              <div class="odb-footer__doc-section">
                <h3>Accuracy</h3>
                <p>While every effort is made to ensure accuracy, Optician's Desk makes no warranty — express or implied — as to the correctness, completeness, or fitness for purpose of any information provided. Formulae and tolerances reflect standard dispensing practice current at time of publication.</p>
              </div>
              <div class="odb-footer__doc-section">
                <h3>AI-generated content</h3>
                <p>Some features use artificial intelligence to assist with queries and suggestions. AI outputs may contain errors and should be independently verified against established clinical references before application.</p>
              </div>
              <div class="odb-footer__doc-section">
                <h3>Liability &amp; regulatory</h3>
                <p>To the fullest extent permitted under New Zealand law, Optician's Desk and its operators accept no liability for any loss or harm arising from reliance on this platform. This tool is not a registered medical device. Use is subject to your obligations under the Health Practitioners Competence Assurance Act 2003.</p>
              </div>
            </div>
          </div>

          <!-- Privacy -->
          <div class="odb-footer__panel" id="odb-panel-privacy">
            <p class="odb-footer__updated">Last updated: May 2025 &middot; New Zealand Privacy Act 2020</p>
            <div class="odb-footer__doc-grid">
              <div class="odb-footer__doc-section">
                <h3>What we collect</h3>
                <ul>
                  <li><strong>Account data</strong> — name, email address, and a hashed password on registration.</li>
                  <li><strong>Payment data</strong> — billing is processed by Stripe. We do not store card details on our servers.</li>
                  <li><strong>Feedback</strong> — name, email, and message submitted via the feedback form.</li>
                  <li><strong>AI interaction data</strong> — queries to AI features are processed by a third-party provider. Do not submit identifiable patient data.</li>
                  <li><strong>Usage data</strong> — anonymised logs to improve the platform.</li>
                </ul>
              </div>
              <div class="odb-footer__doc-section">
                <h3>How we use it</h3>
                <ul>
                  <li>To operate and maintain your account</li>
                  <li>To process membership payments via Stripe</li>
                  <li>To respond to feedback and support requests</li>
                  <li>To improve platform features</li>
                </ul>
                <br/>
                <h3>Calculator inputs</h3>
                <p>Prescription values entered into calculators are processed entirely in your browser. We do not transmit or store this data unless you explicitly save it to your account.</p>
              </div>
              <div class="odb-footer__doc-section">
                <h3>Third parties</h3>
                <p>We use Stripe for payment processing and a third-party AI provider for AI-assisted features. Each operates under its own privacy policy. We do not sell your data.</p>
                <br/>
                <h3>Your rights</h3>
                <p>Under the Privacy Act 2020 you have the right to access and correct personal information we hold. Contact us at <a href="mailto:hello@opticiansdesk.co.nz">hello@opticiansdesk.co.nz</a> or the <a href="https://privacy.org.nz" target="_blank" rel="noopener">Office of the Privacy Commissioner</a> if you have a concern.</p>
              </div>
              <div class="odb-footer__doc-section">
                <h3>Data retention</h3>
                <p>Account data is retained while your account is active and may be deleted on request. Anonymised usage logs may be retained indefinitely.</p>
              </div>
            </div>
          </div>

          <!-- Feedback -->
          <div class="odb-footer__panel" id="odb-panel-feedback">
            <div class="odb-footer__form-grid" id="odb-feedback-form">
              <div class="odb-footer__field">
                <label for="odb-fb-name">Name</label>
                <input type="text" id="odb-fb-name" placeholder="Your name" autocomplete="name" />
              </div>
              <div class="odb-footer__field">
                <label for="odb-fb-email">Email</label>
                <input type="email" id="odb-fb-email" placeholder="you@example.com" autocomplete="email" />
              </div>
              <div class="odb-footer__field full">
                <label for="odb-fb-type">Type</label>
                <select id="odb-fb-type">
                  <option value="">Select&hellip;</option>
                  <option value="bug">Bug report</option>
                  <option value="calculator">Calculator issue</option>
                  <option value="feature">Feature request</option>
                  <option value="data">Lens data / reference error</option>
                  <option value="other">General feedback</option>
                </select>
              </div>
              <div class="odb-footer__field full">
                <label for="odb-fb-msg">Message</label>
                <textarea id="odb-fb-msg" placeholder="Describe the issue or suggestion&hellip;" maxlength="1000"
                  oninput="document.getElementById('odb-fb-char').textContent = this.value.length + ' / 1000'"></textarea>
                <span class="odb-footer__char" id="odb-fb-char">0 / 1000</span>
              </div>
              <div class="odb-footer__field full">
                <label>Overall rating</label>
                <div class="odb-footer__rating-row" id="odb-rating-row">
                  <button onclick="ODB.setRating(1)">1</button>
                  <button onclick="ODB.setRating(2)">2</button>
                  <button onclick="ODB.setRating(3)">3</button>
                  <button onclick="ODB.setRating(4)">4</button>
                  <button onclick="ODB.setRating(5)">5</button>
                </div>
              </div>
              <div class="odb-footer__actions">
                <button class="odb-footer__submit" onclick="ODB.submitFeedback()">Send feedback</button>
                <span class="odb-footer__form-note">Your email is used only to follow up on this message.</span>
              </div>
            </div>
            <p class="odb-footer__success" id="odb-fb-success">Thanks — feedback received. We'll be in touch if a follow-up is needed.</p>
          </div>

          <div class="odb-footer__bottom">
            <p>Optician's Desk — built for NZ optical dispensing</p>
            <p>For clinical emergencies contact your professional body or supervisor.</p>
          </div>

        </div>
      </footer>
    `;

    /* ── Inject dev banner ── */
    const bannerEl = document.getElementById('odb-header');
    if (bannerEl) bannerEl.insertAdjacentHTML('beforebegin', devBannerHTML);

    /* ── Inject header ── */
    const headerEl = document.getElementById('odb-header');
    if (headerEl) headerEl.outerHTML = headerHTML;

    /* ── Inject footer ── */
    const footerEl = document.getElementById('odb-footer');
    if (footerEl) footerEl.outerHTML = footerHTML;

    /* ── Inject agent widget ── */
    const agentFAB = `
      <button class="odb-agent-fab" id="odb-agent-fab" onclick="ODB.agentToggle()" aria-label="Open dispensing assistant">
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="12" rx="10" ry="6"/>
          <circle cx="12" cy="12" r="2.5" fill="rgba(255,255,255,0.75)" stroke="none"/>
        </svg>
      </button>
      <div class="odb-agent-widget" id="odb-agent-widget" role="dialog" aria-label="Dispensing assistant">
        <div class="odb-agent-header">
          <div>
            <div class="odb-agent-header__title">Dispensing Assistant</div>
            <div class="odb-agent-header__sub">Members only &middot; Always verify clinically</div>
          </div>
          <button class="odb-agent-header__close" onclick="ODB.agentClose()" aria-label="Close">&times;</button>
        </div>
        <div class="odb-agent-messages" id="odb-agent-messages"></div>
        <div class="odb-agent-footer" id="odb-agent-footer">
          <textarea
            class="odb-agent-input"
            id="odb-agent-input"
            placeholder="Ask a dispensing question…"
            rows="1"
            onkeydown="ODB.agentKeydown(event)"
            oninput="ODB.agentInputResize(this)"
          ></textarea>
          <button class="odb-agent-send" id="odb-agent-send" onclick="ODB.agentSend()" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2" fill="rgba(255,255,255,0.8)" stroke="none"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', agentFAB);

    /* ── Close widget on outside click ── */
    document.addEventListener('click', (e) => {
      if (!ODB._agentOpen) return;
      const widget = document.getElementById('odb-agent-widget');
      const fab    = document.getElementById('odb-agent-fab');
      if (widget && !widget.contains(e.target) && fab && !fab.contains(e.target)) {
        ODB.agentClose();
      }
    });

    /* ── Close widget on Escape ── */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ODB._agentOpen) ODB.agentClose();
    });

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
    _rating: 0,

    footerTab(id) {
      document.querySelectorAll('.odb-footer__tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === id);
      });
      document.querySelectorAll('.odb-footer__panel').forEach(p => {
        p.classList.toggle('active', p.id === 'odb-panel-' + id);
      });
    },

    setRating(n) {
      this._rating = n;
      document.querySelectorAll('#odb-rating-row button').forEach((b, i) => {
        b.classList.toggle('selected', i < n);
      });
    },

    submitFeedback() {
      const name  = (document.getElementById('odb-fb-name')  || {}).value || '';
      const email = (document.getElementById('odb-fb-email') || {}).value || '';
      const type  = (document.getElementById('odb-fb-type')  || {}).value || '';
      const msg   = (document.getElementById('odb-fb-msg')   || {}).value || '';
      if (!email.trim() || !msg.trim()) { alert('Please enter your email and a message.'); return; }
      const subject = encodeURIComponent('[Opticians Desk] ' + (type || 'Feedback'));
      const body = encodeURIComponent('Name: ' + (name || 'Not provided') + '\nType: ' + (type || '—') + '\nRating: ' + (this._rating || '—') + '/5\n\n' + msg.trim());
      window.open('mailto:hello@opticiansdesk.co.nz?subject=' + subject + '&body=' + body);
      const form = document.getElementById('odb-feedback-form');
      const success = document.getElementById('odb-fb-success');
      if (form) form.style.display = 'none';
      if (success) success.classList.add('show');
    },

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
    },

    // ── Agent widget ────────────────────────────────────────────
    _agentOpen: false,
    _agentMessages: [],   // { role: 'user'|'assistant', content: string }
    _agentBusy: false,

agentToggle() {
  const widget = document.getElementById('odb-agent-widget');
  if (!widget) return;
  this._agentOpen = !this._agentOpen;
  widget.classList.toggle('open', this._agentOpen);
  if (this._agentOpen) {
    if (this._agentMessages.length === 0) {
      fetch('/api/agent/ping', { credentials: 'include' })
        .then(res => {
          if (res.status === 401) {
            this._agentShowGate('Please log in to use the dispensing assistant.');
          } else if (res.status === 403) {
            const messages = document.getElementById('odb-agent-messages');
            const footer   = document.getElementById('odb-agent-footer');
            if (messages) messages.innerHTML = `
              <div class="odb-agent-gate">
                <p>The dispensing assistant is available to members.<br>Upgrade to access AI-powered lens recommendations and clinical guidance.</p>
                <a href="/account#membership">View membership options</a>
              </div>`;
            if (footer) footer.style.display = 'none';
          } else {
            this._agentWelcome();
          }
        })
        .catch(() => { this._agentWelcome(); });
    }
    setTimeout(() => {
      const input = document.getElementById('odb-agent-input');
      if (input) input.focus();
    }, 180);
  }
},

    agentClose() {
      this._agentOpen = false;
      const widget = document.getElementById('odb-agent-widget');
      if (widget) widget.classList.remove('open');
    },

  _agentWelcome() {
    const welcome = 'Hi — ask me anything dispensing-related.\n\nI can help with Rx queries, lens recommendations, calculator guidance, and health condition flags.';
    this._agentMessages.push({ role: 'assistant', content: welcome });
    this._agentRenderMsg('agent', welcome);
  },


    _agentRenderMsg(role, text) {
      const list = document.getElementById('odb-agent-messages');
      if (!list) return;
      const div = document.createElement('div');
      div.className = 'odb-agent-msg ' + role;
      div.textContent = text;
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    },

    _agentShowTyping() {
      const list = document.getElementById('odb-agent-messages');
      if (!list) return;
      const el = document.createElement('div');
      el.className = 'odb-agent-typing';
      el.id = 'odb-agent-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      list.appendChild(el);
      list.scrollTop = list.scrollHeight;
    },

    _agentHideTyping() {
      const el = document.getElementById('odb-agent-typing');
      if (el) el.remove();
    },

    _agentShowGate(msg) {
      const messages = document.getElementById('odb-agent-messages');
      const footer   = document.getElementById('odb-agent-footer');
      if (messages) messages.innerHTML = `
        <div class="odb-agent-gate">
          <p>${msg}</p>
          <a href="/login?redirect=${encodeURIComponent(window.location.pathname)}">Log in</a>
        </div>`;
      if (footer) footer.style.display = 'none';
    },

    async agentSend() {
      if (this._agentBusy) return;
      const input = document.getElementById('odb-agent-input');
      const send  = document.getElementById('odb-agent-send');
      if (!input) return;

      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      input.style.height = 'auto';
      this._agentBusy = true;
      if (send) send.disabled = true;

      // Add to local history and render
      this._agentMessages.push({ role: 'user', content: text });
      this._agentRenderMsg('user', text);
      this._agentShowTyping();

      try {
        const res = await fetch('/api/agent/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ messages: this._agentMessages })
        });

        this._agentHideTyping();

        if (res.status === 401) {
          this._agentShowGate('Please log in to use the dispensing assistant.');
          return;
        }
        if (res.status === 403) {
          const messages = document.getElementById('odb-agent-messages');
          const footer   = document.getElementById('odb-agent-footer');
          if (messages) messages.innerHTML = `
            <div class="odb-agent-gate">
              <p>The dispensing assistant is available to members.<br>Upgrade to access AI-powered lens recommendations, similarity matching, and clinical guidance.</p>
              <a href="/account#membership">View membership options</a>
            </div>`;
          if (footer) footer.style.display = 'none';
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          // Drop the unanswered question so the next request stays valid
          this._agentMessages.pop();
          this._agentRenderMsg('system', err.error || 'Something went wrong — please try again.');
          return;
        }

        const data = await res.json();
        const reply = data.reply || '';
        this._agentMessages.push({ role: 'assistant', content: reply });
        this._agentRenderMsg('agent', reply);

      } catch (err) {
        this._agentHideTyping();
        this._agentRenderMsg('system', 'Connection error — check your network and try again.');
      } finally {
        this._agentBusy = false;
        if (send) send.disabled = false;
        if (input) input.focus();
      }
    },

    agentKeydown(e) {
      // Send on Enter, newline on Shift+Enter
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.agentSend();
      }
    },

    agentInputResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    }
  };

  /* ── Run after DOM is ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
