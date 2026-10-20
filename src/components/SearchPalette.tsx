import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, RotateCcw, Search, SearchX, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { shortDate } from "../lib/date";
import { useStore } from "../lib/store";
import { SECTION_BY_ID, SECTIONS } from "../sections";
import type { Resource } from "../sections/types";
import { loadResources } from "../sections/useResources";

interface SearchResult {
  id: string;
  title: string;
  detail: string;
  href: string;
  external?: boolean;
}
interface SearchGroup { title: string; results: SearchResult[]; more?: { label: string; href: string } }
interface SearchPaletteProps { open: boolean; onOpenChange: (open: boolean) => void; onNavigate: (href: string) => void }

const PAGES = [
  { title: "Home", href: "/", keywords: "landing start" },
  { title: "Today", href: "/today", keywords: "plan timetable daily schedule" },
  { title: "Practice", href: "/practice", keywords: "rc verbal ability redo drill" },
  { title: "Plan and time", href: "/plan", keywords: "schedule minutes timetable" },
  { title: "VARC", href: "/varc", keywords: "verbal ability reading comprehension" },
  { title: "DILR", href: "/dilr", keywords: "data interpretation logical reasoning" },
  { title: "Quant", href: "/quant", keywords: "quantitative ability mathematics" },
  { title: "Progress", href: "/progress", keywords: "scores overview" },
  { title: "Error log", href: "/errors", keywords: "mistakes review" },
  { title: "Words", href: "/words", keywords: "vocabulary flashcards saved" },
  { title: "Reading journal", href: "/journal", keywords: "summaries notes articles" },
  { title: "Guides", href: "/guides", keywords: "how to learn" },
  { title: "CAT and other exams", href: "/exams", keywords: "exam dates" },
  { title: "Updates", href: "/updates", keywords: "latest changes" },
  { title: "Topper stories", href: "/stories", keywords: "student experience" },
  { title: "What's coming", href: "/roadmap", keywords: "roadmap future" },
  { title: "Settings and backup", href: "/settings", keywords: "install export restore data" },
  { title: "About 99ile", href: "/#about", keywords: "about mission privacy" },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLocaleLowerCase();
  const needles = [...new Set(query.toLocaleLowerCase().split(/\s+/).filter(Boolean))];
  const pieces: ReactNode[] = [];
  let from = 0, key = 0;
  while (from < text.length) {
    let at = -1, needle = "";
    for (const candidate of needles) {
      const found = lower.indexOf(candidate, from);
      if (found >= 0 && (at < 0 || found < at || (found === at && candidate.length > needle.length))) {
        at = found;
        needle = candidate;
      }
    }
    if (at < 0) break;
    if (at > from) pieces.push(<span key={key++}>{text.slice(from, at)}</span>);
    pieces.push(<mark key={key++} className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">{text.slice(at, at + needle.length)}</mark>);
    from = at + needle.length;
  }
  if (from < text.length) pieces.push(<span key={key}>{text.slice(from)}</span>);
  return <>{pieces}</>;
}

function excerpt(text: string, query: string, max = 110) {
  const clean = text.replace(/\s+/g, " ").trim();
  const at = clean.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  const start = at > max / 2 ? Math.max(0, at - max / 3) : 0;
  const end = Math.min(clean.length, start + max);
  return (start ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
}

function rankSearch(query: string, title: string, ...values: string[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedTitle = title.toLocaleLowerCase();
  const haystack = [title, ...values].join(" ").toLocaleLowerCase();
  if (!normalizedQuery.split(/\s+/).every((term) => haystack.includes(term))) return 0;
  if (normalizedTitle === normalizedQuery) return 4;
  if (normalizedTitle.startsWith(normalizedQuery)) return 3;
  if (normalizedTitle.includes(normalizedQuery)) return 2;
  return 1;
}

function sortMatches<T>(items: T[], scoreFor: (item: T) => number) {
  return items
    .map((item, index) => ({ item, index, score: scoreFor(item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

export default function SearchPalette({ open, onOpenChange, onNavigate }: SearchPaletteProps) {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [resourceData, setResourceData] = useState<{ sectionId: string; resources: Resource[]; categories: { id: string; n: string }[] }[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceLoaded, setResourceLoaded] = useState(false);
  const [resourceError, setResourceError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resourceLoaded) return;
    let live = true;
    setResourceLoading(true);
    Promise.all(SECTIONS.filter((section) => section.resources).map(async (section) => {
      const data = await loadResources(section);
      return { sectionId: section.id, resources: data.resources, categories: data.categories };
    })).then((data) => {
      if (live) { setResourceData(data); setResourceError(false); setResourceLoaded(true); }
    }).catch(() => {
      if (live) { setResourceError(true); setResourceLoaded(true); }
    }).finally(() => { if (live) setResourceLoading(false); });
    return () => { live = false; };
  }, [resourceLoaded, reloadCount]);

  useEffect(() => { if (open) { setQuery(""); setActive(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);

  const groups = useMemo<SearchGroup[]>(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    const allResources = resourceData.flatMap((set) => set.resources.map((resource) => ({ set, resource })));
    const isBook = ({ set, resource }: typeof allResources[number]) => {
      const category = set.categories.find((item) => item.id === resource.c)?.n ?? "";
      return resource.c === "books" || /\bbooks?\b/i.test(`${resource.t} ${category}`);
    };
    const toResource = ({ set, resource }: typeof allResources[number]): SearchResult => {
      const section = SECTION_BY_ID[set.sectionId as keyof typeof SECTION_BY_ID];
      const category = set.categories.find((item) => item.id === resource.c)?.n ?? section.short;
      return {
        id: `resource-${resource.id}`,
        title: resource.n,
        detail: `${resource.t.replace(/^books?\.\s*/i, "")} · ${category}`,
        href: resource.u,
        external: !resource.u.startsWith("/"),
      };
    };
    const bookRows = sortMatches(allResources.filter(isBook), ({ resource }) => rankSearch(query, resource.n, resource.t, resource.w));
    const resourceRows = sortMatches(allResources.filter((row) => !isBook(row)), ({ resource, set }) => {
      const category = set.categories.find((item) => item.id === resource.c)?.n ?? "";
      return rankSearch(query, resource.n, resource.t, resource.w, category);
    });
    const words = sortMatches(state.vocab, (word) => rankSearch(query, word.w, word.m, word.s)).map<SearchResult>((word) => ({
      id: `word-${word.id}`, title: word.w,
      detail: [word.m, word.s && `Seen in ${word.s}`].filter(Boolean).join(" · "), href: "/words",
    }));
    const notes = sortMatches(state.summaries, (note) => rankSearch(query, note.title || note.from || "", note.from ?? "", note.text, note.tone)).map<SearchResult>((note) => ({
      id: `note-${note.id}`, title: note.title || note.from || (note.src === "rc" ? "RC summary" : "Article summary"),
      detail: `${shortDate(note.d)} · ${excerpt(note.text, query.trim())}`, href: "/journal",
    }));
    const mistakes = sortMatches(state.errors, (error) => rankSearch(query, error.t || error.trap || error.src || "Saved mistake", error.trap, error.src, error.why, error.fix)).map<SearchResult>((error) => ({
      id: `error-${error.id}`, title: error.t || error.trap || error.src || "Saved mistake",
      detail: `${shortDate(error.d)} · ${excerpt([error.src, error.why, error.fix].filter(Boolean).join(". "), query.trim())}`,
      href: "/errors",
    }));
    const pages = sortMatches(PAGES, (page) => rankSearch(query, page.title, page.keywords)).map<SearchResult>((page) => ({
      id: `page-${page.href}`, title: page.title, detail: "Open page", href: page.href,
    }));
    const make = (title: string, results: SearchResult[], more?: SearchGroup["more"]) => results.length ? [{ title, results: results.slice(0, 5), ...(results.length > 5 && more ? { more } : {}) }] : [];
    return [
      ...make("Books", bookRows.map(toResource), { label: "Browse VARC resources", href: "/varc" }),
      ...make("Study resources", resourceRows.map(toResource), { label: "Browse VARC resources", href: "/varc" }),
      ...make("Saved words", words, { label: "Open your word list", href: "/words" }),
      ...make("Reading journal", notes, { label: "Open your journal", href: "/journal" }),
      ...make("Error log", mistakes, { label: "Open your error log", href: "/errors" }),
      ...make("Pages", pages),
    ];
  }, [query, resourceData, state.errors, state.summaries, state.vocab]);

  const flatResults = groups.flatMap((group) => group.results);
  const selected = flatResults[active];
  useEffect(() => {
    if (selected) document.getElementById(`search-result-${selected.id}`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const choose = (result: SearchResult) => {
    if (result.external) window.open(result.href, "_blank", "noopener,noreferrer");
    if (result.external) onOpenChange(false);
    else onNavigate(result.href);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Home" && flatResults.length) { event.preventDefault(); setActive(0); }
    if (event.key === "End" && flatResults.length) { event.preventDefault(); setActive(flatResults.length - 1); }
    if (event.key === "ArrowDown" && flatResults.length) { event.preventDefault(); setActive((value) => Math.min(value + 1, flatResults.length - 1)); }
    if (event.key === "ArrowUp" && flatResults.length) { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
    if (event.key === "Enter" && selected) { event.preventDefault(); choose(selected); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/25 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[10vh] left-1/2 z-[101] flex max-h-[80dvh] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-card shadow-2xl outline-none max-sm:top-3 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100vw-1.5rem)]">
          <Dialog.Title className="sr-only">Search 99ile</Dialog.Title>
          <Dialog.Description className="sr-only">Search books, study resources, saved words, notes, mistakes and pages.</Dialog.Description>
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-4 sm:h-[4.5rem] sm:px-5">
            <Search className="size-5 shrink-0 text-primary" aria-hidden />
            <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
              role="combobox" aria-expanded="true" aria-controls="search-results" aria-activedescendant={selected ? `search-result-${selected.id}` : undefined}
              aria-autocomplete="list" placeholder="Search books, words, notes…" className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/75 sm:text-lg" />
            {query && <button type="button" onClick={() => { setQuery(""); setActive(0); input.current?.focus(); }} aria-label="Clear search" className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-5" aria-hidden /></button>}
            <Dialog.Close aria-label="Close search" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><X className="size-5 sm:hidden" aria-hidden /><kbd className="hidden rounded-md bg-muted px-2 py-1 text-sm sm:inline">Esc</kbd></Dialog.Close>
          </div>

          <div id="search-results" className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {!query.trim() ? <div className="flex flex-col gap-4 px-1 py-2 sm:px-2">
              <div>
                <p className="text-base font-semibold sm:text-lg">Search your study space</p>
                <p className="mt-1 text-sm text-muted-foreground">Find a page, book, saved word, note, or mistake.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: "Practice", href: "/practice", Icon: BookOpen },
                  { title: "Today's plan", href: "/today", Icon: CalendarDays },
                  { title: "Saved words", href: "/words", Icon: BookOpen },
                  { title: "Review mistakes", href: "/errors", Icon: RotateCcw },
                ].map(({ title, href, Icon }) => (
                  <button key={href} type="button" onClick={() => choose({ id: `quick-${href}`, title, detail: "", href })}
                    className="flex min-h-12 items-center gap-3 rounded-xl bg-muted/55 px-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />{title}
                  </button>
                ))}
              </div>
            </div> : groups.length ? <div role="listbox" aria-label="Search results">
              {groups.map((group) => <section key={group.title} role="group" aria-label={group.title} className="mb-3 last:mb-0">
              <h2 className="px-3 pb-1 pt-2 text-sm font-semibold text-muted-foreground">{group.title}</h2>
              <ul>
                {group.results.map((result) => {
                  const index = flatResults.findIndex((item) => item.id === result.id);
                  const isActive = active === index;
                  return <li key={result.id}>
                    <button id={`search-result-${result.id}`} type="button" role="option" aria-selected={isActive} onMouseEnter={() => setActive(index)} onClick={() => choose(result)}
                      className={cn("flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors", isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted/70")}>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold"><Highlight text={result.title} query={query.trim()} /></span>
                        {result.detail && <span className="line-clamp-2 text-sm text-muted-foreground"><Highlight text={result.detail} query={query.trim()} /></span>}
                      </span>
                      {result.external && <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    </button>
                  </li>;
                })}
              </ul>
              {group.more && <button type="button" onClick={() => choose({ id: `more-${group.title}`, title: group.more!.label, detail: "", href: group.more!.href })} className="ml-3 mt-1 min-h-10 text-sm font-medium text-primary hover:underline">{group.more.label} →</button>}
            </section>)}
            </div> : resourceLoading ? <div role="status" className="px-3 py-8 text-center text-sm text-muted-foreground">Searching your resources…</div> : <div className="flex min-h-36 flex-col items-center justify-center gap-2 px-5 text-center">
              <SearchX className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-base font-medium">No results for “{query.trim()}”</p>
              <p className="text-sm text-muted-foreground">Try a book title, saved word, or page name.</p>
            </div>}
            {resourceLoading && query.trim() && <p role="status" className="px-3 py-3 text-sm text-muted-foreground">Loading books and study resources…</p>}
            {resourceError && <div role="alert" className="mt-3 flex flex-col gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
              <p>Some study resources couldn’t load. Your saved work and pages are still searchable.</p>
              <button type="button" onClick={() => { setResourceError(false); setResourceLoaded(false); setReloadCount((count) => count + 1); }}
                className="min-h-10 shrink-0 self-start font-semibold underline underline-offset-2 sm:self-auto">Try again</button>
            </div>}
          </div>

          <div className="hidden shrink-0 items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:flex">
            <span>Search books, resources, and saved work</span><span><kbd className="rounded-md bg-muted px-2 py-1">↑</kbd> <kbd className="rounded-md bg-muted px-2 py-1">↓</kbd> to move · Enter to open</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
