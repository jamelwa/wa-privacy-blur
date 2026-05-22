const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, 'blur.js'), 'utf8');

// Mirrors current WhatsApp Web shape: header without legacy data-testids,
// a group-sender avatar that is a sibling of the bubble (not inside it),
// plus the usual sidebar + bubble structure.
const html = `<!doctype html><html><head></head><body>
<div id="pane-side">
  <div role="row" aria-selected="true">
    <img id="sidebar-avatar" src="avatar.jpg" style="width:40px;height:40px;border-radius:50%">
    <span>Chat Name</span><span>Last preview</span>
  </div>
</div>
<div id="main">
  <header>
    <div role="button" title="Profile details">
      <img id="hdr-avatar" src="header-avatar.jpg" style="width:40px;height:40px;border-radius:50%">
    </div>
    <div id="hdr-info">
      <span id="hdr-name">Active Chat Name</span>
      <span id="hdr-status">online</span>
    </div>
    <div id="hdr-actions">
      <button><svg id="search-icon" style="width:24px;height:24px"></svg></button>
      <button><svg id="menu-icon" style="width:24px;height:24px"></svg></button>
    </div>
  </header>
</div>
<div data-testid="conversation-panel-wrapper">
  <div role="row">
    <img id="sender-avatar" src="sender.jpg" style="width:32px;height:32px;border-radius:50%">
    <div class="message-in">
      <div data-testid="msg-container">
        <span dir="auto">Alice</span>
        <span dir="ltr">hello world</span>
        <img id="photo" src="photo.jpg" style="width:200px;height:200px">
        <div id="sticker" style="background-image:url(sticker.webp);width:80px;height:80px"></div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
});
const { window } = dom;
window.console = console;
window.requestAnimationFrame = (cb) => cb();
window.chrome = undefined;
window.browser = undefined;

function defineLayout(el) {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get() { return parseInt(el.style.width) || 40; } });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get() { return parseInt(el.style.height) || 20; } });
}
function defineLayoutAll(root) {
  defineLayout(root);
  root.querySelectorAll('*').forEach(defineLayout);
}
defineLayoutAll(window.document.body);

const s = window.document.createElement('script');
s.textContent = script;
window.document.body.appendChild(s);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function filterOf(sel) {
  const el = window.document.querySelector(sel);
  return el && el.style.getPropertyValue('filter');
}
function importantOf(sel) {
  const el = window.document.querySelector(sel);
  return el && el.style.getPropertyPriority('filter');
}
function ev(el, type) {
  el.dispatchEvent(new window.MouseEvent(type, { bubbles: true, cancelable: true }));
}

setTimeout(() => {
  try {
    // ── Sidebar ────────────────────────────────────────────────────
    assert(filterOf('#sidebar-avatar') === 'blur(12px)', 'sidebar avatar not blurred');
    assert(importantOf('#sidebar-avatar') === 'important', 'sidebar avatar not !important');

    // ── Header (no legacy data-testids) ────────────────────────────
    assert(filterOf('#hdr-avatar') === 'blur(12px)', 'header avatar not blurred');
    assert(importantOf('#hdr-avatar') === 'important', 'header avatar not !important');
    assert(filterOf('#hdr-name') === 'blur(5px)', 'header name not blurred');
    assert(importantOf('#hdr-name') === 'important', 'header name not !important');
    assert(filterOf('#hdr-status') === 'blur(5px)', 'header status not blurred');
    // Header action icons should remain untouched (navigation)
    assert(!filterOf('#search-icon'), 'search icon should not be blurred');
    assert(!filterOf('#menu-icon'), 'menu icon should not be blurred');

    // ── Group sender avatar (sibling of bubble) ────────────────────
    assert(filterOf('#sender-avatar') === 'blur(12px)', 'group sender avatar (sibling) not blurred');
    assert(importantOf('#sender-avatar') === 'important', 'sender avatar not !important');

    // ── Bubble content ─────────────────────────────────────────────
    assert(filterOf('#photo') === 'blur(12px)', 'message photo not blurred');
    assert(filterOf('#sticker') === 'blur(12px)', 'sticker background not blurred');
    assert(filterOf('[data-testid="msg-container"] span[dir="ltr"]') === 'blur(5px)', 'bubble text not blurred');

    // ── Hover bubble reveals ───────────────────────────────────────
    const bubble = window.document.querySelector('[data-testid="msg-container"]');
    ev(bubble, 'mouseenter');
    assert(filterOf('#photo') === 'none', 'message photo did not reveal on hover');
    assert(filterOf('#sticker') === 'none', 'sticker did not reveal on hover');
    assert(filterOf('[data-testid="msg-container"] span[dir="auto"]') === 'none', 'sender name did not reveal on hover');
    ev(bubble, 'mouseleave');
    assert(filterOf('#photo') === 'blur(12px)', 'message photo did not reblur');
    assert(filterOf('#sticker') === 'blur(12px)', 'sticker did not reblur');

    // ── Hover header reveals ───────────────────────────────────────
    const header = window.document.querySelector('header');
    ev(header, 'mouseenter');
    assert(filterOf('#hdr-avatar') === 'none', 'header avatar did not reveal on hover');
    assert(filterOf('#hdr-name') === 'none', 'header name did not reveal on hover');
    assert(filterOf('#hdr-status') === 'none', 'header status did not reveal on hover');
    ev(header, 'mouseleave');
    assert(filterOf('#hdr-avatar') === 'blur(12px)', 'header avatar did not reblur');
    assert(filterOf('#hdr-name') === 'blur(5px)', 'header name did not reblur');

    // ── Hover sidebar row reveals ──────────────────────────────────
    const row = window.document.querySelector('#pane-side [role="row"]');
    ev(row, 'mouseenter');
    assert(filterOf('#sidebar-avatar') === 'none', 'sidebar avatar did not reveal');
    ev(row, 'mouseleave');
    assert(filterOf('#sidebar-avatar') === 'blur(12px)', 'sidebar avatar did not reblur');

    // ── Reused header DOM (chat switch): WA may overwrite/strip the
    //     inline filter on the same element when re-rendering. The
    //     next scan must re-apply the blur. ────────────────────────
    window.document.querySelector('#hdr-name').style.setProperty('filter', '');
    window.document.querySelector('#hdr-avatar').style.setProperty('filter', '');
    window.__waBlur.scan();
    assert(filterOf('#hdr-name') === 'blur(5px)', 'reused-DOM header name not re-blurred');
    assert(filterOf('#hdr-avatar') === 'blur(12px)', 'reused-DOM header avatar not re-blurred');

    // ── New incoming message gets blurred on next scan ─────────────
    const newMsg = window.document.createElement('div');
    newMsg.className = 'message-out';
    newMsg.innerHTML = '<div data-testid="msg-container"><span dir="ltr">new msg</span><img id="new-photo" src="new.jpg"></div>';
    window.document.querySelector('[data-testid="conversation-panel-wrapper"]').appendChild(newMsg);
    defineLayoutAll(newMsg);
    window.__waBlur.scan();
    assert(filterOf('#new-photo') === 'blur(12px)', 'new message photo not auto blurred');

    // ── Replaced header name node (full subtree swap) ──────────────
    const info = window.document.querySelector('#hdr-info');
    info.innerHTML = '<span id="hdr-name">Different Chat</span><span id="hdr-status">typing…</span>';
    defineLayoutAll(info);
    window.__waBlur.scan();
    assert(filterOf('#hdr-name') === 'blur(5px)', 'replaced header name not blurred');
    assert(filterOf('#hdr-status') === 'blur(5px)', 'replaced header status not blurred');

    console.log('PASS all blur tests');
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e.message);
    process.exit(1);
  }
}, 0);
