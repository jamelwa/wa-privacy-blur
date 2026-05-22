const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, 'blur.js'), 'utf8');

const defaults = {
  sidebarName: true,
  sidebarPreview: true,
  sidebarAvatar: true,
  headerName: true,
  headerAvatar: true,
  msgText: true,
  msgSenderName: true,
  msgMedia: true,
  chatAvatar: true,
  drawer: true,
};

function html() {
  return `<!doctype html><html><body>
<div id="pane-side">
  <div role="row">
    <img id="sidebar-avatar" src="a.jpg" style="width:40px;height:40px;border-radius:50%">
    <span id="sidebar-name">Chat Name</span>
    <span id="sidebar-preview">Last preview</span>
  </div>
</div>
<div id="main"><header><img id="hdr-avatar" src="h.jpg" style="width:40px;height:40px;border-radius:50%"><span id="hdr-name">Header Name</span></header></div>
<div data-testid="conversation-panel-wrapper">
  <div role="row">
    <img id="chat-avatar" src="sender.jpg" style="width:32px;height:32px;border-radius:50%">
    <div class="message-in"><div data-testid="msg-container">
      <span dir="auto" id="sender-name">Alice</span>
      <span dir="ltr" id="msg-text">hello</span>
      <img id="photo" src="p.jpg" style="width:120px;height:120px">
      <div id="sticker" style="background-image:url(sticker.webp);width:80px;height:80px"></div>
    </div></div>
  </div>
</div>
</body></html>`;
}

function runCase(name, opts, checks) {
  return new Promise((resolve, reject) => {
    const dom = new JSDOM(html(), { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
    const { window } = dom;
    window.console = console;
    window.requestAnimationFrame = cb => cb();
    window.chrome = {
      storage: {
        sync: { get(key, cb) { setTimeout(() => cb({ waBlurOpts: { ...defaults, ...opts } }), 0); } },
        onChanged: { addListener() {} },
      },
    };
    window.browser = undefined;

    function defineLayout(el) {
      Object.defineProperty(el, 'offsetWidth', { configurable: true, get() { return parseInt(el.style.width) || 40; } });
      Object.defineProperty(el, 'offsetHeight', { configurable: true, get() { return parseInt(el.style.height) || 20; } });
    }
    defineLayout(window.document.body);
    window.document.body.querySelectorAll('*').forEach(defineLayout);

    const s = window.document.createElement('script');
    s.textContent = script;
    window.document.body.appendChild(s);

    const filterOf = sel => window.document.querySelector(sel).style.getPropertyValue('filter');
    setTimeout(() => {
      try {
        checks(filterOf, window);
        window.__waBlur.observer.disconnect();
        clearInterval(window.__waBlur.interval);
        resolve();
      } catch (e) {
        reject(new Error(`${name}: ${e.message}`));
      }
    }, 20);
  });
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

(async function () {
  try {
    await runCase('sidebar name only', { sidebarName: true, sidebarPreview: false }, f => {
      assert(f('#sidebar-name') === 'blur(5px)', 'sidebar name should blur');
      assert(f('#sidebar-preview') === '', 'sidebar preview should not blur');
    });

    await runCase('sidebar preview only', { sidebarName: false, sidebarPreview: true }, f => {
      assert(f('#sidebar-name') === '', 'sidebar name should not blur');
      assert(f('#sidebar-preview') === 'blur(5px)', 'sidebar preview should blur');
    });

    await runCase('sidebar both off', { sidebarName: false, sidebarPreview: false }, f => {
      assert(f('#sidebar-name') === '', 'sidebar name should not blur');
      assert(f('#sidebar-preview') === '', 'sidebar preview should not blur');
    });

    await runCase('message sender/avatar toggles', {
      msgText: true,
      msgSenderName: false,
      msgMedia: false,
      chatAvatar: true,
      headerAvatar: false,
    }, f => {
      assert(f('#sender-name') === '', 'sender name should not blur');
      assert(f('#msg-text') === 'blur(5px)', 'message text should blur');
      assert(f('#photo') === '', 'message media should not blur');
      assert(f('#sticker') === '', 'sticker should not blur');
      assert(f('#chat-avatar') === 'blur(12px)', 'open chat avatar should blur');
      assert(f('#hdr-avatar') === '', 'header avatar should not blur');
    });

    await runCase('message sender only', {
      msgText: false,
      msgSenderName: true,
      msgMedia: false,
      chatAvatar: false,
    }, f => {
      assert(f('#sender-name') === 'blur(5px)', 'sender name should blur');
      assert(f('#msg-text') === '', 'message text should not blur');
      assert(f('#chat-avatar') === '', 'open chat avatar should not blur');
    });

    console.log('PASS options tests');
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e.message);
    process.exit(1);
  }
})();
