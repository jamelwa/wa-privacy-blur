const defaults = {
  sidebarName: true,
  sidebarPreview: true,
  sidebarAvatar: true,
  headerName: true,
  headerAvatar: true,
  msgText: true,
  msgMedia: true,
  drawer: true,
};

const ids = {
  sidebarName: 'optSidebarName',
  sidebarPreview: 'optSidebarPreview',
  sidebarAvatar: 'optSidebarAvatar',
  headerName: 'optHeaderName',
  headerAvatar: 'optHeaderAvatar',
  msgText: 'optMsgText',
  msgMedia: 'optMsgMedia',
  drawer: 'optDrawer',
};

(async function () {
  const cfg = await chrome.storage.sync.get('waBlurOpts');
  const opts = cfg.waBlurOpts || defaults;
  for (const [key, id] of Object.entries(ids)) {
    document.getElementById(id).checked = opts[key] !== false;
  }

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const out = {};
    for (const [key, id] of Object.entries(ids)) {
      out[key] = document.getElementById(id).checked;
    }
    await chrome.storage.sync.set({ waBlurOpts: out });
    document.getElementById('status').textContent = 'Saved. Reload WhatsApp for changes.';
  });
})();
