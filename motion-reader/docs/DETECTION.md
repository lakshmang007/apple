# Detection: how MotionReader reads pages and text

This document records how recognition works today, which tools are planned but **not yet built**, and every recognition mistake found so far with the fix that was applied.

## Status at a glance

| Tool / technique | Status | Used for |
|---|---|---|
| Projection cutting (XY-cut) on background-subtracted luminance | **Implemented** (`src/lib/panelDetect.ts`) | Finding panels by their gutters |
| Background estimation from full gutter lines | **Implemented** | Choosing white or black as the gutter colour |
| Flood fill from the page edge | **Implemented** | Keeping white areas inside panels from being read as gutters |
| Heuristic action score | **Implemented** | Speed lines, shake and flash on busy panels |
| Pattern rules for text, quotes, headings, sound effects | **Implemented** (`src/lib/textScenes.ts`, `src/lib/loaders.ts`) | Novel mode scenes and chapter headings |
| **OpenCV.js** | **Planned, not installed** | Contours, connected components, text-region and bubble detection |
| **Tesseract.js (OCR)** | **Planned, not installed** | Reading text in pages (titles, narration, dialogue) |
| **Machine-learning panel model** | **Planned, not installed** | Panel detection for irregular and borderless layouts |

Nothing in the table marked *Planned* is running in the app. The tools will be added only after you approve them, because each one adds a large download.

## Planned tools

### OpenCV.js (planned)
- **What:** an open-source (Apache 2.0) computer-vision library compiled to WebAssembly, so it runs in the browser.
- **Why:** contour finding and connected-component analysis. These detect text blocks and speech bubbles, and separate overlapping shapes, which projection cutting can't do.
- **Cost:** a WebAssembly build of several MB, loaded lazily.

### Tesseract.js (planned)
- **What:** an open-source OCR engine (Apache 2.0) that runs in the browser.
- **Why:** reading the words in a bubble or title, so text can be assigned to the correct panel and checked for coverage.
- **Cost:** language data files of several MB each. Japanese data is larger.

### Machine-learning panel model (planned)
- **What:** a small neural network that outputs panel boxes directly.
- **Why:** rule-based cutting struggles with borderless, irregular and overlapping panels. A model can learn those layouts.
- **Cost:** a model file, and the training data must have licences that allow this use. This needs approval before it is started.

## Mistakes found so far, and how they were fixed

These came from the demo pages, the test fixtures and the code review. Each row is a fix that is in the repository.

| # | What went wrong | Cause | Fix |
|---|---|---|---|
| 1 | White panel interiors were read as gutters and cut into fragments. | The first version treated every near-white pixel as background. | Background is now flood-filled from the page edge, so white areas enclosed by ink are kept as content. |
| 2 | On webtoon strips, the detected boxes were wrong (for example, a box only 62 px tall at the top). | The background was estimated from the page border, and strip edges are often artwork. | The background is chosen from full gutter lines, with a bonus for pages whose edge is entirely background (`gutterScore`). The demo strip then produced all six expected beats. |
| 3 | Every dense, hatched panel was marked as an action panel. | The action score used absolute gradient values. | The score is now compared with the page's median, so only panels that stand out from their neighbours count as action. |
| 4 | Row bands were dropped when the cut reached its depth limit. | Only the first band was kept. | All remaining bands are kept as one box. |
| 5 | Tall webtoon panels never triggered their effects. | The viewport trigger needed 55% of the panel visible, which a tall panel can't satisfy. | The trigger now fires when the panel crosses the middle of the screen. |
| 6 | Zoomed-in panels looked blurry. | Pages were drawn at their small size and scaled up. | Pages are drawn at near-native size and scaled down. |
| 7 | Possessives such as "the dogs' bowls" became fake speech bubbles. | A single quote opened a quotation at any apostrophe. | A single quote only opens a quotation after a space, a bracket or a dash. |
| 8 | Prose lines starting with "Part", "Book" or "Act" became chapter headings. | The heading rule only needed one of those words. | Headings now need a number or numeral after the word, or a bare Prologue, Epilogue or Interlude. |
| 9 | Mixed file selections failed with a confusing error. | Only the first file was checked. | Stray non-book files such as `Thumbs.db` are ignored when page images are present. |
| 10 | Pressing Space after clicking a button toggled play twice. | The focused button also handled the key. | Mouse clicks no longer give buttons focus, and Space on a focused button presses that button only. |

## Known limits (not yet fixed)

- **Letters in decorative titles** can still become separate panels. Tests with real title pages are still needed.
- **Speech bubbles and narration boxes** aren't detected. Only panels are.
- **Reading order** is a grid walk and doesn't handle overlapping or Z-shaped layouts.
- **Covers, recap pages and credits** use the same rules as regular pages.
- **No accuracy measurements yet.** Precision, recall and text coverage will be recorded once test fixtures exist.

## How to check recognition

Open the page in the reader and use the settings to turn on **Show detected panels**. The sensitivity slider changes how many small panels are found. A debug export with bounding boxes, scores and rejection reasons is planned, not built.
