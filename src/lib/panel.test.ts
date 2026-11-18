import { describe, expect, it } from "vitest";
import { EXTENSION_ORIGINS, readMessage } from "./panel";
import { seenIn } from "../pages/panel/PanelWords";

const OURS = EXTENSION_ORIGINS[0];
const article = { src: "99ile-ext", type: "article", title: "The case for slower cities", site: "Aeon", link: "https://aeon.co/essays/x", text: "One.\n\nTwo.", selection: true };

describe("messages from the extension (F53, D110)", () => {
  it("takes an article from our extension", () => {
    const m = readMessage(OURS, article);
    expect(m).toMatchObject({ type: "article", title: "The case for slower cities", site: "Aeon", selection: true, text: "One.\n\nTwo." });
  });

  it("refuses any other origin, including other extensions and the site itself", () => {
    expect(readMessage("chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", article)).toBeNull();
    expect(readMessage("https://99ile.in", article)).toBeNull();
    expect(readMessage("https://evil.example", article)).toBeNull();
    expect(readMessage("null", article)).toBeNull();
  });

  it("refuses messages that are not ours or not well formed", () => {
    expect(readMessage(OURS, null)).toBeNull();
    expect(readMessage(OURS, "text")).toBeNull();
    expect(readMessage(OURS, { ...article, src: "other" })).toBeNull();
    expect(readMessage(OURS, { ...article, type: "script" })).toBeNull();
    expect(readMessage(OURS, { ...article, text: "  " })).toBeNull();
    expect(readMessage(OURS, { ...article, text: 42 })).toBeNull();
    expect(readMessage(OURS, { ...article, title: { toString: () => "x" } })).toBeNull();
  });

  it("refuses fields over their limits", () => {
    expect(readMessage(OURS, { ...article, text: "a".repeat(200_001) })).toBeNull();
    expect(readMessage(OURS, { ...article, title: "a".repeat(201) })).toBeNull();
    expect(readMessage(OURS, { ...article, link: "https://x.in/" + "a".repeat(500) })).toBeNull();
  });

  it("takes one to three words of letters as a word, nothing else", () => {
    const w = { src: "99ile-ext", type: "word", sentence: "It was ostensibly  a reform.", title: "T", site: "The Hindu", link: "" };
    expect(readMessage(OURS, { ...w, word: " ostensibly " })).toMatchObject({ type: "word", word: "ostensibly", sentence: "It was ostensibly a reform." });
    expect(readMessage(OURS, { ...w, word: "laissez faire" })).toMatchObject({ word: "laissez faire" });
    expect(readMessage(OURS, { ...w, word: "naïveté" })).toMatchObject({ word: "naïveté" });
    expect(readMessage(OURS, { ...w, word: "one two three four" })).toBeNull();
    expect(readMessage(OURS, { ...w, word: "<img src=x>" })).toBeNull();
    expect(readMessage(OURS, { ...w, word: "" })).toBeNull();
  });

  it("passes on a page it could not read", () => {
    expect(readMessage(OURS, { src: "99ile-ext", type: "unreadable" })).toMatchObject({ type: "unreadable" });
  });
});

describe("a saved word's “Seen in”", () => {
  it("keeps the sentence and the source, shortened", () => {
    expect(seenIn("It was ostensibly a reform.", "The Hindu")).toBe("“It was ostensibly a reform.” (The Hindu)");
    expect(seenIn("", "Aeon")).toBe("Aeon");
    expect(seenIn("x".repeat(300), "Aeon").length).toBeLessThan(260);
  });
});
