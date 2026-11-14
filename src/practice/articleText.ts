import { sentences } from "./sentences";
import { words } from "./types";

/**
 * Article to RC on the device (F34, D104, D107; docs/design/article-to-rc.md): cleaning pasted text, judging whether
 * it is a good CAT read, and choosing the paragraphs to use. All code, no AI: the answer is the same for anyone who
 * pastes the same text.
 */

/** Lines that are page furniture, not the article: ads, related links, share buttons, captions, credits. */
const JUNK = [
  /^advertisement$/i, /^(sponsored|promoted)( content)?$/i, /^also read\b/i, /^read (more|also)\b/i, /^(related|recommended)( stories| articles)?:?$/i,
  /^(share|tweet|whatsapp|copy link|facebook|twitter|linkedin|telegram|email)( this| article)?$/i, /^(subscribe|sign up|log ?in|sign in)\b/i,
  /^(photo|image|file photo|representational image|picture)\b.*(credit|courtesy|getty|reuters|pti|ani|afp)?/i, /^(credit|courtesy|source):/i,
  /^(updated|published|posted)( on)?:?\s/i, /^\d{1,2}:\d{2}\s?(am|pm)?\s?(ist)?$/i, /^(by|written by)\s[\w .'-]{2,40}$/i,
  /^(listen to this article|\d+ min(ute)?s? read)$/i, /^(comments?|\d+ comments?)$/i, /^(follow us|download the app)\b/i,
];

const isJunk = (line: string) => JUNK.some((re) => re.test(line)) || (words(line) <= 3 && !/[.?!]$/.test(line));

/**
 * Pasted or extracted text as clean paragraphs. A blank line ends a paragraph; inside one, broken lines are joined
 * (PDFs and some sites break every line). Page furniture and very short fragments without a full stop are dropped.
 */
export function cleanArticle(raw: string): string[] {
  const blocks = raw.replace(/\r\n?/g, "\n").replace(/ /g, " ").split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && !isJunk(l));
    if (!lines.length) continue;
    // A line ending mid-sentence continues on the next; a hyphen at a line's end joins the word.
    const joined = lines.reduce((acc, l) => (acc ? (acc.endsWith("-") ? acc.slice(0, -1) + l : acc + " " + l) : l), "");
    if (words(joined) >= 8) out.push(joined);
  }
  return out;
}

/** Words that mark an argument: claims, contrasts, hedges and conclusions. CAT passages are thick with them. */
const MARKERS = /\b(however|yet|but|although|though|whereas|nevertheless|nonetheless|argue[sd]?|claims?|suggests?|implies|therefore|thus|hence|because|unless|may|might|perhaps|arguably|rather|instead|indeed|so that|it follows|on the other hand|critics?|contrary)\b/i;

export interface Fit {
  words: number;
  /** good: reads like a CAT passage; easy: more report than argument; short or long: outside 350 to 1,200 words in
   * the chosen part; list: bullet points or a listing, not prose. */
  verdict: "good" | "easy" | "short" | "long" | "list";
  /** Share of sentences with an argument marker, 0 to 1. */
  argument: number;
  /** Minutes at CAT pace: about seven for a 700-word passage with four questions. */
  minutes: number;
  /** One plain line for the student. */
  line: string;
}

export const MIN_WORDS = 350, MAX_WORDS = 1200;

/** Whether the chosen paragraphs read like a CAT passage: length, argument markers, sentence length. */
export function fitCheck(paras: string[]): Fit {
  const n = paras.reduce((t, p) => t + words(p), 0);
  const sents = paras.flatMap(sentences);
  const argument = sents.length ? sents.filter((s) => MARKERS.test(s)).length / sents.length : 0;
  const avgLen = sents.length ? n / sents.length : 0;
  const minutes = Math.max(4, Math.round((n / 700) * 7));
  const shortParas = paras.filter((p) => words(p) < 15).length; // list items, not short news paragraphs
  let verdict: Fit["verdict"];
  if (n < MIN_WORDS) verdict = "short";
  else if (n > MAX_WORDS) verdict = "long";
  else if (shortParas > paras.length / 2) verdict = "list";
  else if (argument >= 0.3 && avgLen >= 16) verdict = "good";
  else verdict = "easy";
  const line = {
    good: `A good CAT read: an argument, about ${minutes} minutes at CAT pace.`,
    easy: "Fine to practise, but it reads more like a report than an argument. CAT passages argue a point; essays and editorials make better practice.",
    short: `Too short: ${n} words. A CAT passage is 400 to 900; use ${MIN_WORDS} or more.`,
    long: `${n} words is longer than one passage. Choose the paragraphs to use below.`,
    list: "This reads like a list or a set of short notes, not a passage. Choose an essay or an editorial.",
  }[verdict];
  return { words: n, verdict, argument, minutes, line };
}

/** The run of whole paragraphs nearest 600 to 900 words, from the start: the part a CAT passage would be. */
export function chooseWindow(paras: string[]): [number, number] {
  const w = paras.map(words);
  let best: [number, number] = [0, paras.length - 1], bestScore = Infinity;
  for (let i = 0; i < paras.length; i++) {
    let sum = 0;
    for (let j = i; j < paras.length; j++) {
      sum += w[j];
      if (sum > MAX_WORDS) break;
      // Closest to 750 words, ties to the earliest start: openings carry the claim.
      const score = sum < 600 ? 600 - sum : sum > 900 ? sum - 900 : 0;
      const tie = score * 1000 + i;
      if (tie < bestScore) { bestScore = tie; best = [i, j]; }
    }
  }
  return best;
}

/** The chosen paragraphs, each cut into sentences by the rule the passage taps use, as the server wants them. */
export const toSentences = (paras: string[]) => paras.map(sentences);

/** A link is kept only as an http(s) address, so a "javascript:" link can never run when it is shown. */
export function safeLink(s: string): string {
  try { const u = new URL(s.trim()); return u.protocol === "https:" || u.protocol === "http:" ? u.href : ""; } catch { return ""; }
}

/**
 * The article's own headline, when the text starts with one: the first line, 2 to 16 words, not a sentence (no full
 * stop at the end) and not page furniture. Code, not AI: a headline is right there in the text.
 */
export function headline(raw: string): string {
  const first = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).find((l) => l) ?? "";
  const n = words(first);
  return n >= 2 && n <= 16 && !/[.!:;,]$/.test(first) && !isJunk(first) && first.length <= 200 ? first : "";
}

/** A site's name from its link, for the source line when the student did not give one: "aeon.co". */
export function siteOf(link: string): string {
  try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/** How an article came in, for the student's list: pasted, a file, the extension or a share. */
export type ArticleOrigin = "paste" | "pdf" | "txt" | "extension" | "share";
export const ORIGIN_LABEL: Record<ArticleOrigin, string> = { paste: "Pasted", pdf: "From a PDF", txt: "From a text file", extension: "From the extension", share: "Shared" };
