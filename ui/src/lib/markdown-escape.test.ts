import { describe, expect, it } from "vitest";
import { escapeMarkdownDestination, escapeMarkdownLabel, escapeMarkdownTitle } from "./markdown-escape";

describe("markdown escaping", () => {
  it("keeps attacker-controlled values inside generated image syntax", () => {
    expect(escapeMarkdownLabel("safe\\](javascript:alert(1))\nnext")).toBe("safe\\\\\\](javascript:alert(1)) next");
    expect(escapeMarkdownDestination("https://example.test/a)\n![x](bad")).toBe("https://example.test/a\\)![x]\\(bad");
    expect(escapeMarkdownTitle('title\\"\nnext')).toBe('title\\\\\\" next');
  });
});
