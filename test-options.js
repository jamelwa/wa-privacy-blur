const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, 'blur.js'), 'utf8');
const html = `<!doctype html><html><body>
<div id="pane-side"><div role="row"><img id="sidebar-avatar" src="a.jpg" style="width:40px;height:40px;border-radius:50%"><span>Chat</span></div></div>
<div id="main"><header><img id="hdr-avatar" src="h.jpg" style="width:40px;height:40px;border-radius:50%"><span id="hdr-name">Header Name</span></header></div>
<div data-testid="conversation-panel-wrapper">
  <div class="message-in"><div data-testid="msg-container"><span dir="ltr" id="msg-text">hello</span><img id="photo" src="p.jpg" style="width:120px;height:120px"><div id="sticker" style="background-image:url(sticker.webp);width:80px;height:80px"></div></div></div>
</div>
</body></html>`;

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true });
const { window } = dom;
window.console = console;
window.requestAnimationFrame = cb => cb();
window.chrome = {
  storage: {
    sync: {
      get(key, cb) {
        setTimeout(() => cb({ waBlurOpts: {
          sidebarName: true, sidebarPreview: true, sidebarAvatar: true,
          headerName: true, headerAvatar: false,
          msgText: true, msgMedia: false, drawer: true,
        }}), 0);
      },
    },
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

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function filterOf(sel) { return window.document.querySelector(sel).style.getPropertyValue('filter'); }

setTimeout(() => {
  try {
    assert(filterOf('#hdr-name') === 'blur(5px)', 'headerName=true should blur header name');
    assert(filterOf('#hdr-avatar') === '', 'headerAvatar=false should leave header avatar unblurred');
    assert(filterOf('#msg-text') === 'blur(5px)', 'msgText=true should blur message text');
    assert(filterOf('#photo') === '', 'msgMedia=false should leave message image unblurred');
    assert(filterOf('#sticker') === '', 'msgMedia=false should leave sticker unblurred');
    assert(filterOf('#sidebar-avatar') === 'blur(12px)', 'sidebarAvatar=true should blur sidebar avatar');
    console.log('PASS options tests');
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e.message);
    process.exit(1);
  }
}, 20);
