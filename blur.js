// WhatsApp Web Privacy Blur — JS-based, row/bubble-scoped
// Blurs: chat list (names, previews, avatars), header (name + avatar),
//        profile drawer, message bubbles (text + media + sender name),
//        group sender avatars adjacent to bubbles.
// Reveal: per-row (sidebar), per-section (header/drawer), per-bubble (chat).

(function () {
  if (window.__waBlur) {
    window.__waBlur.observer.disconnect();
    if (window.__waBlur.interval) clearInterval(window.__waBlur.interval);
    console.log('🔄 Restarting...');
  }

  const BLUR_TXT = 'blur(5px)';
  const BLUR_AV = 'blur(12px)';
  const hovered = new Set();
  const defaults = {
    sidebarName: true, sidebarPreview: true, sidebarAvatar: true,
    headerName: true, headerAvatar: true,
    msgText: true, msgSenderName: true, msgMedia: true, chatAvatar: true, drawer: true,
  };
  let opts = { ...defaults };
  let pending = false;

  function storageApi() {
    try {
      if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) return browser.storage;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage;
    } catch (_) {}
    return null;
  }

  function normalizeOpts(saved) {
    return { ...defaults, ...(saved || {}) };
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  }

  function inHovered(el) {
    for (const h of hovered) if (h === el || h.contains(el)) return true;
    return false;
  }

  // Idempotent: re-applies if filter was stripped (reused DOM after chat switch).
  // Skips while an ancestor is hovered so reveal-on-hover stays in effect.
  function mark(el, strength) {
    if (inHovered(el)) return;
    const want = strength === 'av' ? BLUR_AV : BLUR_TXT;
    if (el.style.getPropertyValue('filter') === want) return;
    el.dataset.waBlurred = strength === 'av' ? 'av' : 'txt';
    el.style.setProperty('filter', want, 'important');
    el.style.transition = 'filter 0.15s ease';
  }

  function unblurAll(container) {
    if (container.dataset.waBlurred) container.style.setProperty('filter', 'none', 'important');
    container.querySelectorAll('[data-wa-blurred]').forEach(el => el.style.setProperty('filter', 'none', 'important'));
  }

  function reblurAll(container) {
    if (container.dataset.waBlurred) {
      container.style.setProperty('filter', container.dataset.waBlurred === 'av' ? BLUR_AV : BLUR_TXT, 'important');
    }
    container.querySelectorAll('[data-wa-blurred]').forEach(el => {
      el.style.setProperty('filter', el.dataset.waBlurred === 'av' ? BLUR_AV : BLUR_TXT, 'important');
    });
  }

  function clearBlurAll() {
    document.querySelectorAll('[data-wa-blurred]').forEach(el => {
      el.style.removeProperty('filter');
      delete el.dataset.waBlurred;
    });
  }

  function hookHover(container) {
    if (container.dataset.waHover) return;
    container.dataset.waHover = '1';
    container.addEventListener('mouseenter', () => { hovered.add(container); unblurAll(container); });
    container.addEventListener('mouseleave', () => { hovered.delete(container); reblurAll(container); });
  }

  // Identify avatar-like elements. Tag-based for raster media; size+roundness
  // heuristic for divs/svgs so we don't blur small navigation icons.
  function isAvatar(el) {
    if (['IMG', 'CANVAS', 'VIDEO'].includes(el.tagName)) return true;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 8 || w > 80 || h < 8 || h > 80) return false;
    const br = parseFloat(getComputedStyle(el).borderRadius) || 0;
    return br >= Math.min(w, h) * 0.4;
  }

  function isSmallRoundAvatar(el) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 8 || w > 80 || h < 8 || h > 80) return false;
    const br = parseFloat(getComputedStyle(el).borderRadius) || 0;
    return br >= Math.min(w, h) * 0.4;
  }

  function findAvatars(el) {
    const out = [];
    for (const c of el.querySelectorAll('*')) {
      if (isAvatar(c)) out.push(c);
    }
    return out;
  }

  function findSmallRoundAvatars(el) {
    const out = [];
    for (const c of el.querySelectorAll('*')) {
      if (isSmallRoundAvatar(c)) out.push(c);
    }
    return out;
  }

  function blurTextSpans(container) {
    container.querySelectorAll('span').forEach(s => {
      if (!s.textContent.trim()) return;
      mark(s);
    });
  }

  // Spans that carry their own visible text (no descendant span also has text).
  // Used by the sidebar so name vs. preview can be toggled independently —
  // the first leaf text span in a row is the contact/group name, the rest are
  // preview/metadata (last message snippet, time, unread badge, …).
  function leafTextSpans(container) {
    const all = Array.from(container.querySelectorAll('span'))
      .filter(s => s.textContent.trim());
    const ancestors = new Set();
    for (const s of all) {
      let p = s.parentElement;
      while (p && p !== container) {
        if (p.tagName === 'SPAN') ancestors.add(p);
        p = p.parentElement;
      }
    }
    return all.filter(s => !ancestors.has(s));
  }

  function scan() {
    // ══════════════════════════════════════════════
    // SIDEBAR — chat rows
    // ══════════════════════════════════════════════
    const side = document.querySelector('#pane-side');
    if (side) {
      side.querySelectorAll('[role="listitem"], [role="row"], [data-testid="cell-frame-container"], [aria-selected]').forEach(row => {
        if (opts.sidebarName || opts.sidebarPreview) {
          const spans = leafTextSpans(row);
          if (spans.length) {
            if (opts.sidebarName) mark(spans[0]);
            if (opts.sidebarPreview) {
              for (let i = 1; i < spans.length; i++) mark(spans[i]);
            }
          }
        }
        if (opts.sidebarAvatar) findAvatars(row).forEach(av => mark(av, 'av'));
        hookHover(row);
      });
    }

    // ══════════════════════════════════════════════
    // HEADER — chat name + avatar
    // Scope to #main so the sidebar's own header isn't matched.
    // Works without legacy data-testids; re-marks reused DOM each scan.
    // ══════════════════════════════════════════════
    const hdr = document.querySelector('#main header')
             || document.querySelector('header[data-testid="conversation-header"]');
    if (hdr) {
      // Avatars: raster media is always blurred. SVGs only via the
      // size+roundness heuristic so navigation icons stay visible.
      if (opts.headerAvatar) {
        hdr.querySelectorAll('img, canvas, video').forEach(m => mark(m, 'av'));
        findAvatars(hdr).forEach(av => mark(av, 'av'));
      }
      // All text-bearing spans in the header — covers name, status, and any
      // future markup variant WA may ship. Action <button>s contain <svg>,
      // not <span>, so icons are unaffected.
      if (opts.headerName) blurTextSpans(hdr);
      hookHover(hdr);
    }

    // ══════════════════════════════════════════════
    // PROFILE / GROUP DRAWER
    // ══════════════════════════════════════════════
    if (opts.drawer) {
      ['section[data-testid="contact-info"]', 'section[data-testid="group-info"]', '[data-testid="drawer-left"]'].forEach(sel => {
        document.querySelectorAll(sel).forEach(sec => {
          blurTextSpans(sec);
          findAvatars(sec).forEach(av => mark(av, 'av'));
          hookHover(sec);
        });
      });
    }

    // ══════════════════════════════════════════════
    // MESSAGE PANEL — bubbles + sender avatars
    // ══════════════════════════════════════════════
    const chatPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]')
                   || document.querySelector('#main [role="application"]')
                   || document.querySelector('#main');
    if (chatPanel) {
      // Group/profile avatars in the open chat often live as siblings of the
      // bubble. Keep them separate from message media so config can toggle each.
      if (opts.chatAvatar) {
        findSmallRoundAvatars(chatPanel).forEach(av => {
          mark(av, 'av');
          const row = av.closest('[role="row"]') || av.closest('[data-testid="msg-container"]') || av.parentElement;
          if (row) hookHover(row);
        });
      }

      chatPanel.querySelectorAll('[data-testid="msg-container"], div[class*="message-in"], div[class*="message-out"]').forEach(bubble => {
        // Sender names and message body can be toggled independently.
        const textSpans = leafTextSpans(bubble).filter(s => s.matches('[dir], [data-testid="author"]'));
        if (textSpans.length > 1) {
          if (opts.msgSenderName) mark(textSpans[0]);
          if (opts.msgText) {
            for (let i = 1; i < textSpans.length; i++) mark(textSpans[i]);
          }
        } else if (opts.msgText && textSpans.length === 1) {
          mark(textSpans[0]);
        }
        // Background-image media (stickers, some attachments).
        if (opts.msgMedia) {
          bubble.querySelectorAll('img, canvas, video').forEach(m => {
            if (!isSmallRoundAvatar(m)) mark(m, 'av');
          });
          bubble.querySelectorAll('*').forEach(el => {
            if (['IMG', 'VIDEO', 'CANVAS', 'SVG'].includes(el.tagName)) return;
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none' && bg.includes('url')) mark(el, 'av');
          });
        }
        if (opts.msgText || opts.msgSenderName || opts.msgMedia || opts.chatAvatar) hookHover(bubble);
      });
    }

    // ══════════════════════════════════════════════
    // GROUP SENDER NAMES (inside bubbles)
    // ══════════════════════════════════════════════
    if (opts.msgSenderName) document.querySelectorAll('[data-testid="author"]').forEach(el => mark(el));
  }

  scan();

  const storage = storageApi();
  if (storage) {
    try {
      storage.sync.get('waBlurOpts', res => {
        const saved = res && res.waBlurOpts;
        opts = normalizeOpts(saved);
        clearBlurAll();
        scan();
      });
      if (storage.onChanged && storage.onChanged.addListener) {
        storage.onChanged.addListener((changes, area) => {
          if (area !== 'sync' || !changes.waBlurOpts) return;
          opts = normalizeOpts(changes.waBlurOpts.newValue);
          clearBlurAll();
          scan();
        });
      }
    } catch (_) {}
  }

  // childList+subtree only — attribute changes (our own style writes) don't
  // re-enter, so no feedback loop. mark() is also a no-op when the filter is
  // already correct, which keeps interval scans cheap.
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('scroll', schedule, true);
  const interval = setInterval(scan, 750);
  window.__waBlur = { observer, scan, interval };

  console.log('🔒 WA Privacy Blur active.');
  console.log('   Sidebar: hover row → reveal names + preview + avatar');
  console.log('   Chat: hover bubble → reveal message text + media');
  console.log('   Header / Profile drawer: hover section → reveal');
  console.log('   Reload page to disable.');
})();
