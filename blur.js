// WhatsApp Web Privacy Blur — JS-based, row/bubble-scoped
// Blurs: chat list (names, previews, avatars), header, profile drawer,
//        message bubbles (text + sender name), group sender names
// Reveal: per-row (sidebar), per-section (header/drawer), per-bubble (chat)
// Paste into browser console (F12). Reload page to disable.

(function () {
  if (window.__waBlur) {
    window.__waBlur.observer.disconnect();
    console.log('🔄 Restarting...');
  }

  const BLUR_TXT = 'blur(5px)';
  const BLUR_AV = 'blur(12px)';
  let pending = false;

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  }

  function mark(el, strength) {
    if (el.dataset.waBlurred) return;
    el.dataset.waBlurred = strength || 'txt';
    el.style.filter = strength || BLUR_TXT;
    el.style.transition = 'filter 0.15s ease';
  }

  function unblurAll(container) {
    container.querySelectorAll('[data-wa-blurred]').forEach(el => el.style.filter = 'none');
  }

  function reblurAll(container) {
    container.querySelectorAll('[data-wa-blurred]').forEach(el => {
      el.style.filter = el.dataset.waBlurred === 'av' ? BLUR_AV : BLUR_TXT;
    });
  }

  function isAvatar(el) {
    if (el.dataset.waBlurred) return false;
    if (['IMG','CANVAS','svg','VIDEO'].includes(el.tagName)) return true;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 8 || w > 72 || h < 8 || h > 72) return false;
    const br = parseFloat(getComputedStyle(el).borderRadius) || 0;
    return br >= Math.min(w, h) * 0.4;
  }

  function findAvatarsIn(el) {
    const out = [];
    for (const c of el.querySelectorAll('*')) {
      if (isAvatar(c)) out.push(c);
    }
    return out;
  }

  function blurTextIn(el) {
    el.querySelectorAll('span').forEach(s => {
      if (s.dataset.waBlurred) return;
      if (!s.textContent.trim()) return;
      if (s.offsetWidth < 10 && s.offsetHeight < 10) return;
      mark(s);
    });
  }

  function scan() {
    // ══════════════════════════════════════════════
    // SIDEBAR — chat rows
    // ══════════════════════════════════════════════
    const side = document.querySelector('#pane-side');
    if (side) {
      side.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"], [aria-selected]').forEach(row => {
        if (row.dataset.waRow) return;
        row.dataset.waRow = '1';

        blurTextIn(row);
        findAvatarsIn(row).forEach(av => mark(av, 'av'));

        row.addEventListener('mouseenter', () => unblurAll(row));
        row.addEventListener('mouseleave', () => reblurAll(row));
      });
    }

    // ══════════════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════════════
    const hdr = document.querySelector('header');
    if (hdr && !hdr.dataset.waRow) {
      hdr.dataset.waRow = '1';
      hdr.querySelectorAll('span[dir="auto"]').forEach(s => { if (s.textContent.trim()) mark(s); });
      hdr.querySelectorAll('[data-testid="conversation-info-header"]').forEach(s => { if (!s.dataset.waBlurred) mark(s); });
      // Blur ALL img/canvas in header (not just ones passing isAvatar shape check)
      hdr.querySelectorAll('img, canvas').forEach(m => mark(m, 'av'));
      // Also blur avatar containers (div with background-image style)
      findAvatarsIn(hdr).forEach(av => mark(av, 'av'));
      hdr.addEventListener('mouseenter', () => unblurAll(hdr));
      hdr.addEventListener('mouseleave', () => reblurAll(hdr));
    }

    // ══════════════════════════════════════════════
    // PROFILE / GROUP DRAWER
    // ══════════════════════════════════════════════
    ['section[data-testid="contact-info"]','section[data-testid="group-info"]','[data-testid="drawer-left"]'].forEach(sel => {
      document.querySelectorAll(sel).forEach(sec => {
        if (sec.dataset.waRow) return;
        sec.dataset.waRow = '1';
        sec.querySelectorAll('span[dir="auto"]').forEach(s => { if (s.textContent.trim()) mark(s); });
        findAvatarsIn(sec).forEach(av => mark(av, 'av'));
        sec.addEventListener('mouseenter', () => unblurAll(sec));
        sec.addEventListener('mouseleave', () => reblurAll(sec));
      });
    });

    // ══════════════════════════════════════════════
    // MESSAGE BUBBLES — per-bubble blur + hover
    // ══════════════════════════════════════════════
    const chatPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
    if (chatPanel) {
      // Each message bubble: [data-testid="msg-container"], div.message-in, div.message-out
      chatPanel.querySelectorAll(
        '[data-testid="msg-container"], ' +
        'div[class*="message-in"], div[class*="message-out"]'
      ).forEach(bubble => {
        if (bubble.dataset.waBubble) return;
        bubble.dataset.waBubble = '1';

        // Blur text inside this bubble (but NOT the sender name — handled below)
        bubble.querySelectorAll('span[dir]').forEach(s => {
          if (s.dataset.waBlurred) return;
          if (!s.textContent.trim()) return;
          mark(s);
        });

        // Blur images/media in bubble (img, video, + background-image divs)
        bubble.querySelectorAll('img, video').forEach(m => mark(m, 'av'));
        bubble.querySelectorAll('*').forEach(el => {
          if (el.dataset.waBlurred) return;
          if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return;
          const bg = getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none' && bg.includes('url')) mark(el, 'av');
        });

        bubble.addEventListener('mouseenter', () => unblurAll(bubble));
        bubble.addEventListener('mouseleave', () => reblurAll(bubble));
      });
    }

    // ══════════════════════════════════════════════
    // GROUP SENDER NAMES (inside bubbles)
    // ══════════════════════════════════════════════
    document.querySelectorAll('[data-testid="author"]').forEach(el => {
      if (el.dataset.waBlurred) return;
      mark(el);
      // Reveal on hover of the parent bubble (handled above) OR direct hover
      el.addEventListener('mouseenter', () => { el.style.filter = 'none'; });
      el.addEventListener('mouseleave', () => { el.style.filter = BLUR_TXT; });
    });
  }

  // Initial run
  scan();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.__waBlur = { observer, scan };

  console.log('🔒 WA Privacy Blur active.');
  console.log('   Sidebar: hover row → reveal names + preview + avatar');
  console.log('   Chat: hover bubble → reveal message text');
  console.log('   Header / Profile drawer: hover section → reveal');
  console.log('   Reload page to disable.');
})();
