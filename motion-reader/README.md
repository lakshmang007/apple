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

## Controls

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `←` `→` | Previous / next (reversed in manga mode) |
| `F` | Fullscreen |
| `N` | Toggle narration (novels) |
| `Esc` | Back to home |

On touch screens: tap the left/right edge or swipe to move, tap the middle to play/pause.

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
