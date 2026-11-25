import type { Book, Chapter, PageImage, ReadingMode, TextBook, VisualBook } from '../types';
import { forgetImage, loadImage } from './panelDetect';

export type Progress = (label: string, fraction: number) => void;

const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;
const TEXT_RE = /\.(txt|md|markdown|text)$/i;

let idCounter = 0;
const uid = () => `p${Date.now().toString(36)}${(idCounter++).toString(36)}`;

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
}

async function pageFromBlob(blob: Blob, name: string): Promise<PageImage> {
  const src = URL.createObjectURL(blob);
  const img = await loadImage(src);
  return { id: uid(), name, src, width: img.naturalWidth, height: img.naturalHeight };
}

function suggestMode(pages: PageImage[], hint: string): ReadingMode {
  if (pages.length === 0) return 'comic';
  const tall = pages.filter((p) => p.height / p.width > 2.2).length;
  if (tall / pages.length > 0.5) return 'webtoon';
  if (/manhwa|webtoon|toon/i.test(hint)) return 'webtoon';
  if (/manga|raw|jp|chapter|ch\.?\s?\d/i.test(hint)) return 'manga';
  return 'comic';
}

function visualBook(title: string, pages: PageImage[], hint: string): VisualBook {
  return { kind: 'visual', title, pages, suggestedMode: suggestMode(pages, hint) };
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

// "Chapter 3", "PART IV", "Book One: …", "# Title", or a bare "Prologue" — but not prose
// that merely starts with one of these words ("Part of me wanted to stay.").
const HEADING_RE =
  /^\s*(#{1,3}\s+.+|(chapter|part|book|act)\s+(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b[^\n]{0,80}|(prologue|epilogue|interlude)\b([^\n]{0,80}[^.!?\n])?)\s*$/i;

export function parsePlainText(raw: string, title: string): TextBook {
  const text = raw.replace(/\r\n?/g, '\n').replace(/ /g, ' ');
  let blocks = text.split(/\n\s*\n/);
  // Files with one paragraph per line (no blank lines) — split on single newlines instead.
  if (blocks.length < 3 && text.split('\n').length > 6) blocks = text.split('\n');

  const chapters: Chapter[] = [];
  let current: Chapter = { title: '', paragraphs: [] };
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    // A heading might be the first line of a block.
    if (HEADING_RE.test(lines[0]) && lines[0].length < 90) {
      if (current.paragraphs.length || current.title) chapters.push(current);
      current = { title: lines[0].replace(/^#+\s*/, ''), paragraphs: [] };
      lines.shift();
      if (lines.length === 0) continue;
    }
    const para = lines
      .join(' ')
      .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (para) current.paragraphs.push(para);
  }
  if (current.paragraphs.length || current.title) chapters.push(current);
  return { kind: 'text', title, chapters: chapters.filter((c) => c.paragraphs.length) };
}

/* ------------------------------------------------------------------ */
/* EPUB                                                                */
/* ------------------------------------------------------------------ */

function resolvePath(base: string, rel: string) {
  const parts = (base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '') + rel;
  const out: string[] = [];
  for (const seg of decodeURIComponent(parts.split('#')[0]).split('/')) {
    if (seg === '..') out.pop();
    else if (seg !== '.' && seg !== '') out.push(seg);
  }
  return out.join('/');
}

function parseXml(src: string, type: DOMParserSupportedType = 'application/xhtml+xml') {
  const doc = new DOMParser().parseFromString(src, type);
  if (doc.getElementsByTagName('parsererror').length) {
    return new DOMParser().parseFromString(src, 'text/html');
  }
  return doc;
}

const loadZip = async (file: File) => (await import('jszip')).default.loadAsync(file);

async function loadEpub(file: File, progress: Progress): Promise<Book> {
  const zip = await loadZip(file);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  if (!container) throw new Error('Not a valid EPUB (missing container.xml)');
  const opfPath = parseXml(container, 'application/xml')
    .getElementsByTagName('rootfile')[0]
    ?.getAttribute('full-path');
  if (!opfPath) throw new Error('Not a valid EPUB (missing package file)');
  const opf = parseXml((await zip.file(opfPath)?.async('string')) ?? '', 'application/xml');

  const title =
    opf.getElementsByTagName('dc:title')[0]?.textContent?.trim() || stripExt(file.name);
  const manifest = new Map<string, string>();
  for (const item of Array.from(opf.getElementsByTagName('item'))) {
    manifest.set(item.getAttribute('id') ?? '', item.getAttribute('href') ?? '');
  }
  const spine = Array.from(opf.getElementsByTagName('itemref'))
    .map((r) => manifest.get(r.getAttribute('idref') ?? ''))
    .filter((h): h is string => !!h)
    .map((h) => resolvePath(opfPath, h));

  const chapters: Chapter[] = [];
  const imagePaths: string[] = [];
  let totalText = 0;

  for (let i = 0; i < spine.length; i++) {
    progress('Reading chapters', i / spine.length);
    const html = await zip.file(spine[i])?.async('string');
    if (!html) continue;
    const doc = parseXml(html);
    for (const el of Array.from(doc.querySelectorAll('img, image'))) {
      const href = el.getAttribute('src') ?? el.getAttribute('xlink:href') ?? el.getAttribute('href');
      if (href) imagePaths.push(resolvePath(spine[i], href));
    }
    const heading = doc.querySelector('h1, h2, h3')?.textContent?.trim() ?? '';
    const paragraphs = Array.from(doc.querySelectorAll('p, blockquote, li'))
      .filter((el) => !el.querySelector('p'))
      .map((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 1);
    totalText += paragraphs.reduce((n, p) => n + p.length, 0);
    if (paragraphs.length) {
      chapters.push({
        title: heading || (chapters.length === 0 ? title : `Part ${chapters.length + 1}`),
        paragraphs: paragraphs[0] === heading ? paragraphs.slice(1) : paragraphs,
      });
    }
  }

  // Fixed-layout / image EPUBs (common for comics & manga) become a visual book.
  if (imagePaths.length >= 3 && totalText < imagePaths.length * 150) {
    const pages: PageImage[] = [];
    const unique = [...new Set(imagePaths)];
    for (let i = 0; i < unique.length; i++) {
      progress('Extracting pages', i / unique.length);
      const entry = zip.file(unique[i]);
      if (!entry) continue;
      try {
        pages.push(await pageFromBlob(await entry.async('blob'), unique[i]));
      } catch {
        /* skip undecodable images */
      }
    }
    if (pages.length) return visualBook(title, pages, file.name + title);
  }

  if (!chapters.length) throw new Error('No readable text found in this EPUB');
  return { kind: 'text', title, chapters };
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

async function loadPdf(file: File, progress: Progress): Promise<Book> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const title = stripExt(file.name);
  const n = doc.numPages;

  // Decide whether this is a text book or a scanned / illustrated comic.
  const pageText = async (i: number) => {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let out = '';
    for (const item of content.items) {
      if ('str' in item) out += item.str + (item.hasEOL ? '\n' : ' ');
    }
    return out;
  };
  const sampleCount = Math.min(n, 8);
  let sampleChars = 0;
  for (let i = 1; i <= sampleCount; i++) {
    sampleChars += (await pageText(Math.max(1, Math.round((i / sampleCount) * n)))).trim().length;
  }

  if (sampleChars / sampleCount > 350) {
    const lines: string[] = [];
    for (let i = 1; i <= n; i++) {
      progress('Extracting text', i / n);
      lines.push(...(await pageText(i)).split('\n'));
    }
    // Re-flow lines into paragraphs: a paragraph ends on a short line with closing punctuation.
    const trimmed = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const avg = trimmed.reduce((s, l) => s + l.length, 0) / Math.max(1, trimmed.length);
    let buf = '';
    const out: string[] = [];
    for (const line of trimmed) {
      if (HEADING_RE.test(line) && line.length < 60) {
        if (buf) out.push(buf);
        out.push('', line, '');
        buf = '';
        continue;
      }
      buf = buf ? (buf.endsWith('-') ? buf.slice(0, -1) + line : `${buf} ${line}`) : line;
      if (/[.!?"”’)]$/.test(line) && line.length < avg * 0.8) {
        out.push(buf, '');
        buf = '';
      }
    }
    if (buf) out.push(buf);
    return parsePlainText(out.join('\n'), title);
  }

  const pages: PageImage[] = [];
  for (let i = 1; i <= n; i++) {
    progress('Rendering pages', (i - 1) / n);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, 2000 / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Render failed'))), 'image/jpeg', 0.9),
    );
    pages.push(await pageFromBlob(blob, `Page ${i}`));
    page.cleanup();
  }
  return visualBook(title, pages, file.name);
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

async function loadArchive(file: File, progress: Progress): Promise<Book> {
  const zip = await loadZip(file);
  if (zip.file('META-INF/container.xml')) return loadEpub(file, progress);
  const entries = Object.values(zip.files)
    .filter((f) => !f.dir && IMAGE_RE.test(f.name) && !/(^|\/)(__MACOSX|\.)/.test(f.name))
    .sort((a, b) => naturalSort(a.name, b.name));
  if (!entries.length) throw new Error('No images found inside the archive');
  const pages: PageImage[] = [];
  for (let i = 0; i < entries.length; i++) {
    progress('Extracting pages', i / entries.length);
    try {
      pages.push(await pageFromBlob(await entries[i].async('blob'), entries[i].name));
    } catch {
      /* skip undecodable images */
    }
  }
  return visualBook(stripExt(file.name), pages, file.name);
}

function isBookFile(f: File) {
  return (
    /\.(cbz|zip|epub|pdf|cbr|rar|cb7|7z)$/i.test(f.name) ||
    f.type === 'application/pdf' ||
    TEXT_RE.test(f.name)
  );
}

/** Frees a loaded book's page images (blob URLs and detection caches). Demo books are kept. */
export function releaseBook(book: Book) {
  if (book.kind !== 'visual') return;
  for (const p of book.pages) {
    if (p.id.startsWith('demo-')) continue;
    forgetImage(p.src);
    URL.revokeObjectURL(p.src);
  }
}

export async function loadFiles(files: File[], progress: Progress): Promise<Book> {
  if (files.length === 0) throw new Error('No files selected');
  const images = files
    .filter((f) => f.type.startsWith('image/') || IMAGE_RE.test(f.name))
    .sort((a, b) => naturalSort(a.name, b.name));

  // Stray non-book files next to page images (Thumbs.db, .DS_Store, notes…) are ignored.
  const bookFile = files.find((f) => isBookFile(f));
  if (images.length > 0 && (images.length === files.length || !bookFile)) {
    const pages: PageImage[] = [];
    for (let i = 0; i < images.length; i++) {
      progress('Loading images', i / images.length);
      pages.push(await pageFromBlob(images[i], images[i].name));
    }
    const title = images.length === 1 ? stripExt(images[0].name) : 'My comic';
    return visualBook(title, pages, images.map((f) => f.name).join(' '));
  }

  const file = bookFile ?? files[0];
  const name = file.name.toLowerCase();
  if (/\.(cbz|zip)$/.test(name)) return loadArchive(file, progress);
  if (name.endsWith('.epub')) return loadEpub(file, progress);
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return loadPdf(file, progress);
  if (TEXT_RE.test(name) || file.type.startsWith('text/')) {
    progress('Reading text', 0.5);
    return parsePlainText(await file.text(), stripExt(file.name));
  }
  if (/\.(cbr|rar|cb7|7z)$/.test(name)) {
    throw new Error('RAR/7z archives are not supported — please convert to CBZ or ZIP.');
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

export const ACCEPT =
  'image/*,.cbz,.zip,.pdf,.epub,.txt,.md,.markdown,application/pdf,application/epub+zip';
