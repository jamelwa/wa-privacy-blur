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

const ids = {
  sidebarName: 'optSidebarName',
  sidebarPreview: 'optSidebarPreview',
  sidebarAvatar: 'optSidebarAvatar',
  headerName: 'optHeaderName',
  headerAvatar: 'optHeaderAvatar',
  msgText: 'optMsgText',
  msgSenderName: 'optMsgSenderName',
  msgMedia: 'optMsgMedia',
  chatAvatar: 'optChatAvatar',
  drawer: 'optDrawer',
};

function storageArea() {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.sync) return browser.storage.sync;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) return chrome.storage.sync;
  return null;
}

function getSync(key) {
  const store = storageArea();
  if (!store) return Promise.resolve({});
  return new Promise(resolve => {
    const result = store.get(key, resolve);
    if (result && typeof result.then === 'function') result.then(resolve);
  });
}

function setSync(value) {
  const store = storageArea();
  if (!store) return Promise.resolve();
  return new Promise(resolve => {
    const result = store.set(value, resolve);
    if (result && typeof result.then === 'function') result.then(resolve);
  });
}

(async function () {
  const cfg = await getSync('waBlurOpts');
  const opts = { ...defaults, ...(cfg.waBlurOpts || {}) };
  for (const [key, id] of Object.entries(ids)) {
    document.getElementById(id).checked = opts[key] !== false;
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const out = {};
    for (const [key, id] of Object.entries(ids)) {
      out[key] = document.getElementById(id).checked;
    }
    await setSync({ waBlurOpts: out });
    document.getElementById('status').textContent = 'Saved. WhatsApp updates automatically.';
  });
})();
