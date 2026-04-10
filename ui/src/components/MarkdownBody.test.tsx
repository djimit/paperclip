// @vitest-environment node

import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildAgentMentionHref, buildProjectMentionHref, buildSkillMentionHref } from "@paperclipai/shared";
import { ThemeProvider } from "../context/ThemeContext";
import { MarkdownBody } from "./MarkdownBody";

vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("MarkdownBody", () => {
  it("renders markdown images without a resolver", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>{"![](/api/attachments/test/content)"}</MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain('<img src="/api/attachments/test/content" alt=""/>');
  });

  it("resolves relative image paths when a resolver is provided", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody resolveImageSrc={(src) => `/resolved/${src}`}>
          {"![Org chart](images/org-chart.png)"}
        </MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain('src="/resolved/images/org-chart.png"');
    expect(html).toContain('alt="Org chart"');
  });

  it("renders agent, project, and skill mentions as chips", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>
          {`[@CodexCoder](${buildAgentMentionHref("agent-123", "code")}) [@Paperclip App](${buildProjectMentionHref("project-456", "#336699")}) [/release-changelog](${buildSkillMentionHref("skill-789", "release-changelog")})`}
        </MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain('href="/agents/agent-123"');
    expect(html).toContain('data-mention-kind="agent"');
    expect(html).toContain("--paperclip-mention-icon-mask");
    expect(html).toContain('href="/projects/project-456"');
    expect(html).toContain('data-mention-kind="project"');
    expect(html).toContain("--paperclip-mention-project-color:#336699");
    expect(html).toContain('href="/skills/skill-789"');
    expect(html).toContain('data-mention-kind="skill"');
  });

  it("uses soft-break styling by default", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>
          {"First line\nSecond line"}
        </MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain("First line<br/>");
    expect(html).toContain("Second line");
  });

  it("can opt out of soft-break styling", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody softBreaks={false}>
          {"First line\nSecond line"}
        </MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).not.toContain("<br/>");
  });

  it("does not inject extra line-break nodes into nested lists", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>
          {"1. Parent item\n   - child a\n   - child b\n\n2. Second item"}
        </MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).not.toContain("[&amp;_p]:whitespace-pre-line");
    expect(html).not.toContain("Parent item<br/>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<ul>");
  });

  it("linkifies bare issue identifiers in markdown text", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>{"Depends on PAP-1271 for the hover state."}</MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain('href="/issues/PAP-1271"');
    expect(html).toContain(">PAP-1271<");
  });

  it("rewrites full issue URLs to internal issue links", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <MarkdownBody>{"See http://localhost:3100/PAP/issues/PAP-1179."}</MarkdownBody>
      </ThemeProvider>,
    );

    expect(html).toContain('href="/issues/PAP-1179"');
    expect(html).toContain(">http://localhost:3100/PAP/issues/PAP-1179<");
  });
});
