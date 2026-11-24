import { ArrowUpRight } from 'lucide-react';

/**
 * Legal places to find something to read. Only official sites; nothing here
 * points to scan or piracy sites. "Open here" sources are public domain or
 * openly licensed, so their files can be downloaded and opened in MotionReader.
 */

interface Source {
  name: string;
  url: string;
  text: string;
  licence: string;
  formats?: string;
  note?: string;
}

const OPEN_HERE: Source[] = [
  {
    name: 'Comic Book Plus',
    url: 'https://comicbookplus.com/',
    text: 'Thousands of public-domain Golden Age comics.',
    licence: 'Public domain',
    formats: 'CBZ · PDF',
    note: 'Pick CBZ or PDF; CBR files need converting first.',
  },
  {
    name: 'Digital Comic Museum',
    url: 'https://digitalcomicmuseum.com/',
    text: 'A large library of public-domain Golden Age comics.',
    licence: 'Public domain',
    formats: 'CBZ · PDF',
    note: 'Downloads need a free account.',
  },
  {
    name: 'Internet Archive',
    url: 'https://archive.org/search?query=comics',
    text: 'Public-domain comic and pulp collections.',
    licence: 'Public domain',
    formats: 'PDF · CBZ',
    note: "Check each item's licence before sharing it."
  },
  {
    name: 'Pepper&Carrot',
    url: 'https://www.peppercarrot.com/',
    text: 'An anime-style webcomic by David Revoy, with downloadable pages.',
    licence: 'CC BY 4.0',
    formats: 'JPG · PNG',
    note: 'Credit David Revoy if you share or reuse it.',
  },
  {
    name: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/wiki/Category:Comics',
    text: 'Scans of public-domain comic and manga pages.',
    licence: 'Public domain / open licences',
    formats: 'JPG · PNG',
    note: 'Each file page states its licence.',
  },
  {
    name: 'Give My Regards to Black Jack',
    url: 'https://en.wikipedia.org/wiki/Give_My_Regards_to_Black_Jack',
    text: 'A Japanese medical-drama manga by Shuho Sato, who made it free to reuse.',
    licence: 'Free reuse by the author',
    formats: 'Images',
  },
  {
    name: 'Project Gutenberg',
    url: 'https://www.gutenberg.org/',
    text: 'Over 70,000 public-domain books, great for Novel mode.',
    licence: 'Public domain',
    formats: 'EPUB · TXT',
  },
  {
    name: 'Standard Ebooks',
    url: 'https://standardebooks.org/',
    text: 'Carefully formatted public-domain books for Novel mode.',
    licence: 'Public domain',
    formats: 'EPUB',
  },
];

const READ_THERE: Source[] = [
  {
    name: 'WEBTOON',
    url: 'https://www.webtoons.com/',
    text: 'Official free webtoon and manhwa episodes.',
    licence: 'Free to read on WEBTOON',
  },
  {
    name: 'Tapas',
    url: 'https://tapas.io/',
    text: 'Free official comics and webtoons from independent creators and publishers.',
    licence: 'Free to read on Tapas',
  },
  {
    name: 'MANGA Plus by Shueisha',
    url: 'https://mangaplus.shueisha.co.jp/',
    text: 'Official free chapters of Shueisha manga, released alongside Japan.',
    licence: 'Free to read on MANGA Plus',
  },
  {
    name: 'GlobalComix',
    url: 'https://globalcomix.com/',
    text: 'Free official comics, manga and webtoons.',
    licence: 'Free to read on GlobalComix',
  },
  {
    name: 'Libby',
    url: 'https://libbyapp.com/',
    text: 'Comics, manga and books from your public library.',
    licence: 'Library card · copy-protected',
  },
  {
    name: 'Hoopla',
    url: 'https://www.hoopladigital.com/',
    text: 'Comics and books from participating libraries.',
    licence: 'Library card · copy-protected',
  },
];

function SourceCard({ s }: { s: Source }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-0 flex-col bg-white p-5 transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-900">{s.name}</div>
        <ArrowUpRight size={16} className="mt-0.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-900" />
      </div>
      <p className="mt-1 flex-1 text-sm text-slate-500">{s.text}</p>
      {s.note && <p className="mt-2 text-xs text-slate-500">{s.note}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          {s.licence}
        </span>
        {s.formats && (
          <span className="border border-slate-200 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-500">
            {s.formats}
          </span>
        )}
      </div>
    </a>
  );
}

export function FreeComics() {
  return (
    <section id="free" className="space-y-6 pt-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Find free comics</h2>
        <p className="mt-1 max-w-prose text-sm text-slate-500">
          Legal places to find something to read. Links open the official site in a new tab.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Download and open here</h3>
          <span className="text-xs text-slate-500">Public domain or openly licensed</span>
        </div>
        <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {OPEN_HERE.map((s) => (
            <SourceCard key={s.name} s={s} />
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Download the file on that site, then use <span className="font-semibold text-slate-700">Open a file</span>.
          Pasting a link works only when the site lets other websites read its files, and many don't.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Read free on the official site</h3>
          <span className="text-xs text-slate-500">Licensed; can't be opened in MotionReader</span>
        </div>
        <div className="grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {READ_THERE.map((s) => (
            <SourceCard key={s.name} s={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
