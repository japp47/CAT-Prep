import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Command, RotateCcw, Search, SearchX, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { shortDate } from "../lib/date";
import { usePref } from "../lib/prefs";
import { useStore } from "../lib/store";
import { SECTION_BY_ID, SECTIONS } from "../sections";
import { API_ENABLED } from "../lib/api";
import type { Resource } from "../sections/types";
import { loadResources } from "../sections/useResources";
import { historyItems } from "../practice/history";

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
  { title: "Weekly review", href: "/review", keywords: "week sunday focus improved slipped reflection" },
  { title: "Analyse a mock", href: "/progress/mock-review", keywords: "mock analysis review careless mistakes skipped" },
  { title: "Error log", href: "/errors", keywords: "mistakes review" },
  { title: "Words", href: "/words", keywords: "vocabulary flashcards saved" },
  { title: "Reading journal", href: "/journal", keywords: "summaries notes articles" },
  { title: "Guides", href: "/guides", keywords: "how to learn" },
  { title: "CAT and other exams", href: "/exams", keywords: "exam dates" },
  { title: "Updates", href: "/updates", keywords: "latest changes" },
  { title: "Topper stories", href: "/stories", keywords: "student experience" },
  { title: "What's coming", href: "/roadmap", keywords: "roadmap future" },
  { title: "Settings and backup", href: "/settings", keywords: "install export restore data" },
  { title: "About 99ile", href: "/#about", keywords: "about mission" },
  { title: "Privacy", href: "/privacy", keywords: "privacy data delete export contact grievance cookies stored" },
  { title: "You: your CAT and your study", href: "/you", keywords: "you profile me account target percentile first attempt repeat working studying student member streak days questions" },
  { title: "History", href: "/history", keywords: "history past days calendar did done yesterday week log timeline what i did passages attempts" },
  // Only in builds with sync (B4); found by the words people use for it, and each action by its own name.
  ...(API_ENABLED ? [
    { title: "Sync between devices", href: "/you#sync", keywords: "sync link code qr scan devices phone laptop recovery move transfer progress another device cloud backup online account sign in login google gmail" },
    { title: "Sign in", href: "/signin", keywords: "sign in login log in google gmail account email sync save progress sign out logout" },
    { title: "Link a device", href: "/you#sync", keywords: "sync add phone laptop tablet qr code scan join connect another device" },
    { title: "Recovery code", href: "/you#sync", keywords: "sync lost phone new device get progress back restore recover code" },
    { title: "Your devices", href: "/you#sync", keywords: "sync remove device list phone laptop signed in" },
    { title: "Download what the server has", href: "/you#sync", keywords: "sync export data copy server backup file privacy" },
    { title: "Turn off sync or delete synced data", href: "/you#sync", keywords: "sync stop disable delete erase remove data everywhere privacy" },
  ] : []),
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

/** A word's simple form, so "syncing" finds "sync" and "devices" finds "device". Short words are kept as typed. */
function stem(term: string) {
  for (const end of ["ing", "ed", "es", "s"]) if (term.length - end.length >= 3 && term.endsWith(end)) return term.slice(0, -end.length);
  return term;
}

export function rankSearch(query: string, title: string, ...values: string[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedTitle = title.toLocaleLowerCase();
  const haystack = [title, ...values].join(" ").toLocaleLowerCase();
  if (!normalizedQuery.split(/\s+/).every((term) => haystack.includes(term) || haystack.includes(stem(term)))) return 0;
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

const TOUR_STEPS = [
  { title: "Your whole study space, one search away", detail: "Open search from the magnifying glass, or press ⌘K on Mac / Ctrl+K on Windows." },
  { title: "Search the way you remember it", detail: "Try a page name, a book, or a phrase from a saved word, note, or mistake. The closest matches come first." },
  { title: "Go straight to the next step", detail: "Choose a result to jump there. On a keyboard, use the arrow keys and press Enter." },
];

function SearchTourArt({ step }: { step: number }) {
  if (step === 0) return (
    <div className="flex min-h-36 items-center justify-center rounded-2xl bg-muted/60 p-5">
      <div className="flex items-center gap-4 rounded-2xl bg-card px-5 py-4">
        <span className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Search className="size-6" aria-hidden /></span>
        <span className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Open search</span>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Command className="size-4" aria-hidden /><kbd className="rounded-md bg-muted px-2 py-1">K</kbd><span>from anywhere</span></span>
        </span>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="flex min-h-36 flex-col justify-center gap-3 rounded-2xl bg-muted/60 p-4">
      <div className="flex h-11 items-center gap-3 rounded-xl bg-card px-3 text-sm text-muted-foreground">
        <Search className="size-5 text-primary" aria-hidden /><span>progress</span>
      </div>
      <div className="rounded-xl bg-card p-3">
        <p className="text-sm font-medium text-muted-foreground">Pages</p>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground">
          <BookOpen className="size-5 shrink-0" aria-hidden /><span><mark className="rounded-sm bg-highlight px-0.5 text-highlight-foreground">Progress</mark></span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-36 flex-col justify-center gap-3 rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center gap-3 rounded-xl bg-accent px-3 py-3 text-accent-foreground">
        <BookOpen className="size-5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">Progress</span>
          <span className="block text-sm text-muted-foreground">Open page</span>
        </span>
        <ArrowRight className="size-5 shrink-0" aria-hidden />
      </div>
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <kbd className="rounded-md bg-card px-2 py-1">↑</kbd><kbd className="rounded-md bg-card px-2 py-1">↓</kbd>
        <span>move</span><span className="px-1">·</span><kbd className="rounded-md bg-card px-2 py-1">Enter</kbd><span>open</span>
      </p>
    </div>
  );
}

export default function SearchPalette({ open, onOpenChange, onNavigate }: SearchPaletteProps) {
  const { state } = useStore();
  const [tourSeen, setTourSeen] = usePref("search-tour-seen", false);
  const [query, setQuery] = useState("");
  const [resourceData, setResourceData] = useState<{ sectionId: string; resources: Resource[]; categories: { id: string; n: string }[] }[]>([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceLoaded, setResourceLoaded] = useState(false);
  const [resourceError, setResourceError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [active, setActive] = useState(0);
  const [tourStep, setTourStep] = useState(0);
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

  useEffect(() => { if (open) { setQuery(""); setActive(0); setTourStep(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);

  // Newest first, so a passage done twice is found on its latest day. Mistakes and redo rows have no title to find.
  const practiceItems = useMemo(() => historyItems(state).filter((x) => x.kind !== "mistakes" && x.icon !== "redo").sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)), [state]);
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
    // Your own practice, by title (F51): the newest time each one was done, opened on its day in History.
    const seen = new Set<string>();
    const practiced = sortMatches(practiceItems, (x) => rankSearch(query, x.title, x.detail)).filter((x) => !seen.has(x.title) && !!seen.add(x.title)).map<SearchResult>((x) => ({
      id: `history-${x.id}`, title: x.title, detail: `${shortDate(x.d)} · ${x.detail}`, href: `/history?d=${x.d}`,
    }));
    const pages = sortMatches(PAGES, (page) => rankSearch(query, page.title, page.keywords)).map<SearchResult>((page) => ({
      id: `page-${page.href}-${page.title}`, title: page.title, detail: "Open page", href: page.href,
    }));
    const make = (title: string, results: SearchResult[], more?: SearchGroup["more"]) => results.length ? [{ title, results: results.slice(0, 5), ...(results.length > 5 && more ? { more } : {}) }] : [];
    return [
      ...make("Books", bookRows.map(toResource), { label: "Browse VARC resources", href: "/varc" }),
      ...make("Study resources", resourceRows.map(toResource), { label: "Browse VARC resources", href: "/varc" }),
      ...make("Saved words", words, { label: "Open your word list", href: "/words" }),
      ...make("Reading journal", notes, { label: "Open your journal", href: "/journal" }),
      ...make("Your practice", practiced, { label: "See all in History", href: `/history?q=${encodeURIComponent(query.trim())}` }),
      ...make("Error log", mistakes, { label: "Open your error log", href: "/errors" }),
      ...make("Pages", pages),
    ];
  }, [query, resourceData, state.errors, state.summaries, state.vocab, practiceItems]);

  const flatResults = groups.flatMap((group) => group.results);
  const selected = flatResults[active];
  useEffect(() => {
    if (selected) document.getElementById(`search-result-${selected.id}`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const choose = (result: SearchResult) => {
    setTourSeen(true);
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
  const finishTour = () => { setTourSeen(true); input.current?.focus(); };
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !tourSeen && !query.trim()) setTourSeen(true);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/25 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[10vh] left-1/2 z-[101] flex max-h-[80dvh] w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-card shadow-2xl outline-none max-sm:top-3 max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:w-[calc(100vw-1.5rem)]">
          <Dialog.Title className="sr-only">Search 99ile</Dialog.Title>
          <Dialog.Description className="sr-only">Search books, study resources, saved words, notes, mistakes and pages.</Dialog.Description>
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-4 sm:h-[4.5rem] sm:px-5">
            <Search className="size-5 shrink-0 text-primary" aria-hidden />
            <input ref={input} value={query} onChange={(event) => { if (event.target.value.trim()) setTourSeen(true); setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown}
              role="combobox" aria-expanded="true" aria-controls="search-results" aria-activedescendant={selected ? `search-result-${selected.id}` : undefined}
              aria-autocomplete="list" placeholder="Search books, words, notes…" className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/75 sm:text-lg" />
            {query && <button type="button" onClick={() => { setQuery(""); setActive(0); input.current?.focus(); }} aria-label="Clear search" className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-5" aria-hidden /></button>}
            <Dialog.Close aria-label="Close search" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"><X className="size-5 sm:hidden" aria-hidden /><kbd className="hidden rounded-md bg-muted px-2 py-1 text-sm sm:inline">Esc</kbd></Dialog.Close>
          </div>

          <div id="search-results" className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {!query.trim() && !tourSeen ? <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-1 py-2 sm:gap-5 sm:px-2">
              <div role="group" aria-label={`Step ${tourStep + 1} of ${TOUR_STEPS.length}`} className="flex items-center gap-2">
                {TOUR_STEPS.map((step, index) => <span key={step.title} className={cn("h-1.5 flex-1 rounded-full", index <= tourStep ? "bg-primary" : "bg-muted")} />)}
                <span className="ml-1 shrink-0 text-sm text-muted-foreground">{tourStep + 1} of {TOUR_STEPS.length}</span>
              </div>
              <SearchTourArt step={tourStep} />
              <div className="min-h-16">
                <h2 className="text-lg font-semibold sm:text-xl">{TOUR_STEPS[tourStep].title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{TOUR_STEPS[tourStep].detail}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={finishTour} className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Skip tour</button>
                <button type="button" onClick={() => tourStep + 1 < TOUR_STEPS.length ? setTourStep((step) => step + 1) : finishTour()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
                  {tourStep + 1 < TOUR_STEPS.length ? "Next" : "Try search"}<ArrowRight className="size-4" aria-hidden />
                </button>
              </div>
            </div> : !query.trim() ? <div className="flex flex-col gap-4 px-1 py-2 sm:px-2">
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
              <button type="button" onClick={() => { setTourStep(0); setTourSeen(false); }}
                className="min-h-10 self-start text-sm font-medium text-primary underline underline-offset-4 hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                See how search works
              </button>
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
