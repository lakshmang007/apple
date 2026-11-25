import type { Book, ReadingMode } from '../types';
import { loadFiles, type Progress } from './loaders';

/**
 * Opening books from a web link. Everything still runs in the browser: the
 * file is downloaded with fetch() and then handled exactly like an upload.
 * That only works when the other site allows it (CORS); when it doesn't,
 * the error says so and suggests downloading the file instead.
 */

const MAX_BYTES = 500 * 1024 * 1024;
const MAX_PAGE_IMAGES = 300;

/** Turns common "view" links into direct-download links. */
export function normalizeLink(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That isn't a web address. Paste a full link that starts with https://");
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http:// and https:// links can be opened.');
  }
  // github.com/<owner>/<repo>/blob/<ref>/<path> → the raw file.
  if (url.hostname === 'github.com') {
    const m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    if (m) return new URL(`https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`);
  }
  // Dropbox share links → direct download.
  if (url.hostname === 'www.dropbox.com' || url.hostname === 'dropbox.com') {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }
  // drive.google.com/file/d/<id>/view → direct download.
  const drive = url.hostname === 'drive.google.com' && url.pathname.match(/\/file\/d\/([^/]+)/);
  if (drive) return new URL(`https://drive.usercontent.google.com/download?id=${drive[1]}&export=download`);
  return url;
}

function blockedMessage(host: string, byThisPage: boolean) {
  return byThisPage
    ? `This copy of MotionReader is not allowed to load files from other websites. Download the file from ${host} and use "Open a file" instead.`
    : `${host} doesn't let other websites read its files, so MotionReader can't open this link directly. Download the file and use "Open a file" instead.`;
}

interface Download {
  blob: Blob;
  type: string;
  name: string;
  finalUrl: URL;
}

async function download(url: URL, onProgress?: (fraction: number) => void): Promise<Download> {
  // A Content-Security-Policy block and a CORS block both surface as a plain
  // TypeError; the securitypolicyviolation event tells them apart.
  let cspBlocked = false;
  const onCsp = (e: SecurityPolicyViolationEvent) => {
    if (e.blockedURI && e.blockedURI.startsWith(url.origin)) cspBlocked = true;
  };
  document.addEventListener('securitypolicyviolation', onCsp);
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'follow' });
  } catch {
    await new Promise((r) => setTimeout(r, 0));
    throw new Error(blockedMessage(url.hostname, cspBlocked));
  } finally {
    document.removeEventListener('securitypolicyviolation', onCsp);
  }
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? `${url.hostname} refused the download (${res.status}). Make sure the link is public.`
        : `The link returned an error (${res.status}). Check that it is public and still exists.`,
    );
  }

  const total = Number(res.headers.get('content-length')) || 0;
  if (total > MAX_BYTES) throw new Error('That file is larger than 500 MB, which is too big to open in the browser.');
  let blob: Blob;
  if (res.body && total && onProgress) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (received > MAX_BYTES) {
        await reader.cancel();
        throw new Error('That file is larger than 500 MB, which is too big to open in the browser.');
      }
      onProgress(Math.min(1, received / total));
    }
    blob = new Blob(chunks as BlobPart[], { type: res.headers.get('content-type') ?? '' });
  } else {
    blob = await res.blob();
  }

  const finalUrl = new URL(res.url || url.href);
  const disposition = res.headers.get('content-disposition') ?? '';
  const fromHeader = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  let name = fromHeader ? decodeURIComponent(fromHeader) : '';
  if (!name) {
    const last = finalUrl.pathname.split('/').filter(Boolean).pop() ?? '';
    try {
      name = decodeURIComponent(last);
    } catch {
      name = last;
    }
  }
  return { blob, type: (res.headers.get('content-type') ?? '').toLowerCase(), name: name || finalUrl.hostname, finalUrl };
}

type Kind = 'pdf' | 'zip' | 'image' | 'html' | 'text' | 'unknown';

async function sniff(d: Download): Promise<{ kind: Kind; ext: string }> {
  const head = new Uint8Array(await d.blob.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...head);
  if (ascii.startsWith('%PDF')) return { kind: 'pdf', ext: 'pdf' };
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    const ext = /\.(epub|cbz)$/i.exec(d.name)?.[1].toLowerCase() ?? 'zip';
    return { kind: 'zip', ext };
  }
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { kind: 'image', ext: 'jpg' };
  if (ascii.startsWith('\x89PNG')) return { kind: 'image', ext: 'png' };
  if (ascii.startsWith('GIF8')) return { kind: 'image', ext: 'gif' };
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { kind: 'image', ext: 'webp' };
  if (ascii.slice(4, 12) === 'ftypavif') return { kind: 'image', ext: 'avif' };
  if (d.type.includes('html')) return { kind: 'html', ext: 'html' };
  const start = (await d.blob.slice(0, 512).text()).trimStart().toLowerCase();
  if (start.startsWith('<!doctype html') || start.startsWith('<html')) return { kind: 'html', ext: 'html' };
  if (d.type.startsWith('text/') || /\.(txt|md|markdown|text)$/i.test(d.name)) return { kind: 'text', ext: 'txt' };
  return { kind: 'unknown', ext: '' };
}

/** Image URLs on a web page, in page order (lazy-loading attributes first). */
function pageImageUrls(doc: Document, base: URL): URL[] {
  const seen = new Set<string>();
  const out: URL[] = [];
  for (const img of Array.from(doc.querySelectorAll('img'))) {
    let src = '';
    for (const attr of ['data-src', 'data-lazy-src', 'data-original', 'data-url', 'src']) {
      const v = img.getAttribute(attr)?.trim();
      if (v && !v.startsWith('data:')) {
        src = v;
        break;
      }
    }
    // Prefer the largest candidate from srcset when present.
    const srcset = img.getAttribute('srcset') ?? img.getAttribute('data-srcset');
    if (srcset) {
      const best = srcset
        .split(',')
        .map((c) => c.trim().split(/\s+/))
        .map(([u, w]) => ({ u, w: parseFloat(w) || 0 }))
        .sort((a, b) => b.w - a.w)[0];
      if (best?.u && !best.u.startsWith('data:')) src = best.u;
    }
    if (!src) continue;
    let u: URL;
    try {
      u = new URL(src, base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || /\.(svg|ico)(\?|$)/i.test(u.pathname) || seen.has(u.href)) continue;
    seen.add(u.href);
    out.push(u);
    if (out.length >= MAX_PAGE_IMAGES) break;
  }
  return out;
}

async function pagesFromWebPage(d: Download, progress: Progress): Promise<{ files: File[]; title: string }> {
  const doc = new DOMParser().parseFromString(await d.blob.text(), 'text/html');
  const base = new URL(doc.querySelector('base')?.getAttribute('href') ?? '', d.finalUrl);
  const urls = pageImageUrls(doc, base);
  if (urls.length === 0) {
    throw new Error('No images were found on that page. Paste a link to the file itself (PDF, CBZ, EPUB, image or TXT).');
  }

  const found: Array<File | null> = new Array(urls.length).fill(null);
  let blocked = 0;
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const i = next++;
      try {
        const img = await download(urls[i]);
        const { kind, ext } = await sniff(img);
        if (kind === 'image') {
          const bmp = await createImageBitmap(img.blob);
          // Skip icons, avatars and banners: comic pages are reasonably large.
          if (bmp.width >= 300 && bmp.height >= 300) {
            found[i] = new File([img.blob], `${String(i).padStart(4, '0')}.${ext}`, { type: img.blob.type });
          }
          bmp.close();
        }
      } catch {
        blocked++;
      }
      progress('Downloading page images', ++done / urls.length);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  const files = found.filter((f): f is File => f !== null);
  if (files.length === 0) {
    throw new Error(
      blocked > 0
        ? `The images on that page are hosted on a site that doesn't let other websites read them. Download the pages and use "Open a file" instead.`
        : 'No page-sized images were found on that page.',
    );
  }
  const title = doc.title.trim() || d.finalUrl.hostname;
  return { files, title };
}

export async function loadFromUrl(raw: string, progress: Progress): Promise<Book> {
  const url = normalizeLink(raw);
  progress('Downloading', 0);
  const d = await download(url, (f) => progress('Downloading', f));
  const { kind, ext } = await sniff(d);

  let book: Book;
  if (kind === 'html') {
    const { files, title } = await pagesFromWebPage(d, progress);
    book = await loadFiles(files, progress);
    book.title = title;
  } else if (kind === 'unknown') {
    throw new Error("That link isn't a file MotionReader can open. Use a link to a PDF, CBZ, ZIP, EPUB, image or TXT file.");
  } else {
    const base = d.name.replace(/\.[^.]+$/, '') || url.hostname;
    const file = new File([d.blob], `${base}.${ext}`, { type: d.blob.type });
    book = await loadFiles([file], progress);
  }
  book.sourceUrl = raw.trim();
  return book;
}

/** A MotionReader address that opens the same link for whoever follows it. */
export function shareLinkFor(sourceUrl: string, mode?: ReadingMode) {
  const params = new URLSearchParams({ open: sourceUrl });
  if (mode) params.set('mode', mode);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

/** The `?open=` link (and optional `?mode=`) this page was opened with, if any. */
export function linkFromAddress(): { url: string; mode?: ReadingMode } | null {
  try {
    const params = new URLSearchParams(location.search);
    const url = params.get('open') ?? params.get('url');
    if (!url) return null;
    const mode = params.get('mode');
    return {
      url,
      mode: mode === 'comic' || mode === 'manga' || mode === 'webtoon' ? mode : undefined,
    };
  } catch {
    return null;
  }
}

/** Shows (or clears) the share address in the browser's address bar. */
export function setAddress(sourceUrl: string | null, mode?: ReadingMode) {
  try {
    const target = sourceUrl ? shareLinkFor(sourceUrl, mode) : `${location.origin}${location.pathname}`;
    if (target !== location.href) history.replaceState(null, '', target);
  } catch {
    /* some embedded viewers don't allow changing the address */
  }
}
