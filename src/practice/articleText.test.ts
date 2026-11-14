import { describe, expect, it } from "vitest";
import { chooseWindow, cleanArticle, fitCheck, headline, safeLink, siteOf } from "./articleText";

const para = (n: number, extra = "") => `This sentence ${n} argues that cities may grow because cheap land draws firms outward, though critics disagree${extra}. ` +
  `However, the evidence suggests the effect is partly local and may fade over time as rents rise in the centre.`;

describe("cleaning pasted articles", () => {
  it("drops page furniture and joins broken lines, keeping the paragraphs", () => {
    const raw = ["Why cities grow", "", "By Asha Rao", "Updated: 13 Nov 2026", "", "First line of the opening paragraph that breaks", "in the middle of a sentence and goes on to the end.",
      "", "Advertisement", "", "Also read: Ten things about traffic", "", "A second paragraph with enough words to count as real prose here.", "", "Share", "Photo: PTI"].join("\n");
    expect(cleanArticle(raw)).toEqual([
      "First line of the opening paragraph that breaks in the middle of a sentence and goes on to the end.",
      "A second paragraph with enough words to count as real prose here.",
    ]);
  });
  it("rejoins a word hyphenated at a line's end", () => {
    expect(cleanArticle("The planners worried about con-\ngestion in the old centre of the city for years.")).toEqual(["The planners worried about congestion in the old centre of the city for years."]);
  });
});

describe("the good CAT read check", () => {
  it("calls an argued essay of the right length a good read", () => {
    const f = fitCheck(Array.from({ length: 12 }, (_, i) => para(i)));
    expect(f.verdict).toBe("good");
    expect(f.words).toBeGreaterThan(350);
    expect(f.minutes).toBeGreaterThanOrEqual(4);
  });
  it("calls a plain report easy, and flags short text and lists", () => {
    const report = Array.from({ length: 18 }, (_, i) => `On day ${i} the team visited the factory and met the workers there. They walked through the building and took notes for the report.`);
    expect(fitCheck(report).verdict).toBe("easy");
    expect(fitCheck([para(1)]).verdict).toBe("short");
    expect(fitCheck(Array.from({ length: 40 }, (_, i) => `Item ${i}: a short note.`).concat(Array.from({ length: 10 }, (_, i) => para(i)))).verdict).toBe("list");
  });
  it("chooses the run of paragraphs nearest 600 to 900 words", () => {
    const paras = Array.from({ length: 30 }, (_, i) => para(i));
    const [a, b] = chooseWindow(paras);
    const n = paras.slice(a, b + 1).join(" ").split(/\s+/).length;
    expect(a).toBe(0);
    expect(n).toBeGreaterThanOrEqual(600);
    expect(n).toBeLessThanOrEqual(900);
  });
});

describe("links", () => {
  it("keeps web addresses and drops anything that could run or mislead", () => {
    expect(safeLink(" https://aeon.co/essays/x ")).toBe("https://aeon.co/essays/x");
    for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x/a", "aeon.co", ""]) expect(safeLink(bad)).toBe("");
  });
});

describe("titles and sources", () => {
  it("takes the article's headline from its first line, but not a sentence or page furniture", () => {
    expect(headline("\n  Why cities keep growing  \n\nBy Asha Rao\n\nFirst paragraph.")).toBe("Why cities keep growing");
    expect(headline("Cities grow because land is cheap at the edge.\nMore text.")).toBe("");
    expect(headline("Advertisement\nWhy cities grow")).toBe("");
    expect(headline("One")).toBe("");
  });
  it("names the site from a link", () => {
    expect(siteOf("https://www.thehindu.com/opinion/x")).toBe("thehindu.com");
    expect(siteOf("not a link")).toBe("");
  });
});
