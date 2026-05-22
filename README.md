# WA Privacy Blur

Browser extension that blurs WhatsApp Web content for privacy — hover to reveal.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Firefox](https://img.shields.io/badge/firefox-%3E%3D140-orange)

## What it does

Automatically blurs sensitive content on WhatsApp Web to protect your screen from shoulder-surfing:

- **Chat list** — contact/group names, last message previews, avatars
- **Header** — contact/group name and profile picture
- **Profile drawer** — name, about, phone number
- **Message bubbles** — text content and media
- **Group chat** — sender names

Everything stays blurred until you hover your mouse over it — then it smoothly reveals. Move away and it blurs again.

## Install

### Firefox

1. Download the [latest `.xpi` or `.zip` from Releases](https://github.com/jamelwa/wa-privacy-blur/releases)
2. Go to `about:addons` → gear icon → "Install Add-on From File"
3. Select the downloaded file

Or install from [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/wa-privacy-blur/) (coming soon).

### Chrome / Edge / Brave

Not yet published. To load manually:
1. Clone this repo
2. Go to `chrome://extensions` → "Load unpacked"
3. Select the extension folder

> **Note:** Chrome requires Manifest V3. This extension currently uses V2 for Firefox compatibility. A V3 manifest will be added.

## Build

```bash
npm install -g web-ext
web-ext build
```

Output: `web-ext-artifacts/wa_privacy_blur-1.0.zip`

## Privacy

This extension does **not** collect, transmit, or store any personal data. All blur/hover logic runs locally in your browser. No analytics, no tracking, no accounts.

## License

MIT — see [LICENSE](LICENSE)
