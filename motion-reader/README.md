# MotionReader

**Turn any comic, manga, manhwa or book into an animated, cinematic reading experience** — entirely in the browser.

Open a file (or try a built-in demo) and press play: a virtual camera glides from panel to panel, action panels shake the screen with speed lines and impact flashes, webtoons glide in with parallax, and novels become kinetic, mood-coloured scenes with dialogue bubbles and optional read-aloud narration.

## Features

| | |
|---|---|
| **Automatic panel detection** | Finds panels by recursively cutting along white/black gutters (with background flood-fill so white panel interiors aren't mistaken for gutters) and orders them in reading order. |
| **Comic mode (L→R) & Manga mode (R→L)** | Cinematic camera: page overview → zoom to each panel, slow Ken Burns drift, pans across very wide/tall panels, spotlight dimming, slide/zoom/flip/fade page transitions. |
| **Action effects** | Panels with busy line work (speed lines, impact bursts, SFX lettering) that stand out from the rest of the page get screen shake, flash, speed-line overlay and an impact sound. |
| **Manhwa / Webtoon mode** | Long strips are split into beats that reveal with motion, parallax and focus-dimming, with hands-free auto-scroll (scroll anytime to take over). |
| **Living novels** | Text is split into scenes. Each gets a detected mood (calm, joy, sorrow, fear, fury, mystery, action, romance) that drives the colours and weather (rain, embers, fog, sparkles…). Words animate in, quotes become speech bubbles, and sound words like *CRASH!* slam onto the screen. |
| **Narration** | Read-aloud via the browser's Speech Synthesis API with word-by-word highlighting and automatic page turns. |
| **Sound effects** | Synthesised whooshes, impacts and page turns (Web Audio — no audio files). |
| **Private** | Everything runs locally; files never leave the device. |

### Supported files

- Images (`jpg`, `png`, `webp`, `gif`, `avif`) — select several at once to read them as pages
- `cbz` / `zip` archives of page images
- `pdf` — scanned/illustrated PDFs are rendered as pages; text PDFs are re-flowed into a novel
- `epub` — text EPUBs become novels; image/fixed-layout EPUBs become comics
- `txt` / `md` — chapters are detected from headings like `Chapter 3` or `# Title`

(`cbr`/`rar` aren't supported in the browser — convert to CBZ.)

### Open from a link, and share links

Instead of uploading, paste a link on the home page ("Or open from a link"):

- a direct link to any supported file (PDF, CBZ/ZIP, EPUB, image, TXT), or
- a web page that shows the comic pages as images (lazy-loaded `data-src` images are picked up; small icons are skipped).

GitHub file pages, Dropbox share links and Google Drive file links are converted to direct downloads automatically.

A book opened from a link gets a **share link** (shown on the ready card, copied by the link button in the reader, and kept in the address bar), for example:

```
https://your-site.example/?open=https%3A%2F%2Fexample.com%2Fchapter-1.cbz&mode=manga
```

Opening that address loads the same book, in the same reading mode, for anyone. Nothing is uploaded anywhere: each visitor's browser downloads the file directly.

**Limits:** the browser can only download from sites that allow it (CORS headers). GitHub raw files, many CDNs and most object storage with public CORS work; sites that don't allow it show a message suggesting to download the file and open it instead. Files opened from the device can't be shared by link. Share links need MotionReader to be hosted on its own site (any static host); embedded previews that block outside requests or drop the `?open=` part can't use them.

## Controls

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` `→` | Previous / next (reversed in manga mode) |
| `F` | Fullscreen |
| `N` | Toggle narration (novels) |
| `Esc` | Back to home |

On touch screens: tap the left/right edge or swipe to move, tap the middle to play/pause.

## Live site

https://lakshmang007.github.io/apple/ is built and published by the GitHub Actions workflow in `.github/workflows/deploy-motion-reader.yml` whenever `main` changes. Share links use this address, e.g. `https://lakshmang007.github.io/apple/?open=<link>&mode=manga`.

To enable it on a fresh copy of the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**, then run the workflow from the Actions tab (or push to `main`).

## Run locally

```bash
cd motion-reader
npm install
npm run dev        # http://localhost:3001
npm run build      # static site in dist/ (deployable to any static host)
npm run lint       # type-check
```

## Project layout

```
src/
  App.tsx                 app shell: home → loading → ready → player
  components/
    Landing.tsx           home page, drag & drop, demos, animated preview
    ComicPlayer.tsx       panel camera for comics & manga
    WebtoonPlayer.tsx     vertical scroll player for manhwa / webtoons
    StoryPlayer.tsx       kinetic-typography player for text books
    Effects.tsx           particles, speed lines, flash, vignette, SFX burst
    Chrome.tsx            player controls & settings sheet
  lib/
    panelDetect.ts        gutter-based panel detection + action scoring
    loaders.ts            images / CBZ / PDF / EPUB / TXT → book
    textScenes.ts         scene splitting, mood & SFX detection
    demo.ts               procedurally drawn demo comic, webtoon & story
    sound.ts              synthesised sound effects
```
