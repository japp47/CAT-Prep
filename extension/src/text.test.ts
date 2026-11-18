import { describe, expect, it } from "vitest";
import { asParagraphs, locate, sentenceWith } from "./text";
import { cleanArticle } from "../../src/practice/articleText";

describe("the extension's text helpers (F53, D110)", () => {
  it("keeps paragraphs apart for the site's clean-up", () => {
    const blocks = ["The first paragraph makes   a claim about cities and how they grow.", "Ad", "The second\nparagraph qualifies it with care and some evidence."];
    const text = asParagraphs(blocks);
    expect(text.split("\n\n")).toHaveLength(2);
    expect(cleanArticle(text)).toHaveLength(2);
  });

  it("finds the sentence a word was in", () => {
    const t = "Reform is hard. The reform was ostensibly about efficiency, but its aim was control. Nobody said so.";
    expect(sentenceWith(t, "Ostensibly")).toBe("The reform was ostensibly about efficiency, but its aim was control.");
    expect(sentenceWith("No match here at all.", "word")).toBe("No match here at all.");
  });

  it("finds a deciding line on the page despite quotes, dashes and spacing", () => {
    const page = "Intro text. “Identity,” she wrote — rather pointedly — “is a story we keep\n   telling, not a fact.” Then more.";
    const line = "\"Identity,\" she wrote - rather pointedly - \"is a story we keep telling, not a fact.\"";
    const at = locate(page, line);
    expect(at).not.toBeNull();
    const found = page.slice(at![0], at![1]);
    expect(found.startsWith("Identity")).toBe(true);
    expect(found.endsWith("fact")).toBe(true);
  });

  it("finds nothing for a line that is not there, or too short to be sure", () => {
    expect(locate("Some page text about ships and planks.", "A sentence about something else entirely.")).toBeNull();
    expect(locate("Some page text.", "Some")).toBeNull();
  });
});
