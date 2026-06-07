import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertTriangle, BookOpen, History, Link2, Lock, Pencil } from "lucide-react";
import type {
  DocumentReviewIndex,
  DocumentSuggestionWithComments,
} from "@paperclipai/shared";
import { DocumentReviewRail } from "@/components/documents/DocumentReviewRail";
import { SuggestionCard } from "@/components/documents/SuggestionCard";
import { SelectionToolbar } from "@/components/documents/SelectionToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "@/components/MarkdownBody";

/**
 * Storybook coverage for the document detail / review surface (PAP-10568).
 *
 * Renders the real review rail, suggestion cards, and selection toolbar with
 * fixture data so UX/QA can capture desktop screenshots for sign-off without a
 * live backend. Behaviour is unit-tested alongside each component.
 */

const HOUR = 1000 * 60 * 60;
const now = new Date("2026-06-07T12:00:00Z").getTime();

const agentMap = new Map([
  ["agent-claude", { id: "agent-claude", name: "ClaudeCoder" }],
  ["agent-cto", { id: "agent-cto", name: "CTO" }],
]);

function suggestion(overrides: Partial<DocumentSuggestionWithComments>): DocumentSuggestionWithComments {
  return {
    id: "sug",
    companyId: "c",
    issueId: "i",
    documentId: "d",
    documentKey: "spec",
    kind: "substitution",
    status: "pending",
    anchorState: "active",
    anchorConfidence: "exact",
    originalRevisionId: "rev-12",
    originalRevisionNumber: 12,
    currentRevisionId: "rev-12",
    currentRevisionNumber: 12,
    selectedText: "review state and suggested edits.",
    proposedText: "review state, suggested edits, and orphan reconciliation.",
    insertionPosition: null,
    prefixText: "",
    suffixText: "",
    normalizedStart: 0,
    normalizedEnd: 10,
    markdownStart: 0,
    markdownEnd: 10,
    anchorSelector: {
      quote: { exact: "review state and suggested edits.", prefix: "", suffix: "" },
      position: { normalizedStart: 0, normalizedEnd: 10, markdownStart: 0, markdownEnd: 10 },
    },
    createdByAgentId: "agent-claude",
    createdByUserId: null,
    acceptedByAgentId: null,
    acceptedByUserId: null,
    acceptedAt: null,
    acceptedRevisionId: null,
    rejectedByAgentId: null,
    rejectedByUserId: null,
    rejectedAt: null,
    createdAt: new Date(now - 2 * HOUR),
    updatedAt: new Date(now - 2 * HOUR),
    comments: [
      {
        id: "sc1",
        companyId: "c",
        suggestionId: "sug",
        issueId: "i",
        documentId: "d",
        body: "Looks right. Ship.",
        authorType: "agent",
        authorAgentId: "agent-cto",
        authorUserId: null,
        createdByRunId: null,
        createdAt: new Date(now - HOUR),
        updatedAt: new Date(now - HOUR),
      },
    ],
    ...overrides,
  };
}

const reviewIndex: DocumentReviewIndex = {
  issueId: "i",
  documentId: "d",
  documentKey: "spec",
  latestRevisionId: "rev-12",
  latestRevisionNumber: 12,
  counts: {
    unresolved: 4,
    openAnchoredThreads: 2,
    openReviewThreads: 1,
    pendingSuggestions: 3,
    resolvedAnchoredThreads: 1,
    resolvedReviewThreads: 0,
    acceptedSuggestions: 0,
    rejectedSuggestions: 1,
    staleAnchors: 1,
    orphanedAnchors: 1,
  },
  annotationThreads: [
    {
      id: "t-open",
      companyId: "c",
      issueId: "i",
      documentId: "d",
      documentKey: "spec",
      status: "open",
      anchorState: "active",
      anchorConfidence: "exact",
      originalRevisionId: "rev-12",
      originalRevisionNumber: 12,
      currentRevisionId: "rev-12",
      currentRevisionNumber: 12,
      selectedText: "the orchestrator should never proceed",
      prefixText: "",
      suffixText: "",
      normalizedStart: 0,
      normalizedEnd: 10,
      markdownStart: 0,
      markdownEnd: 10,
      anchorSelector: { quote: { exact: "the orchestrator should never proceed", prefix: "", suffix: "" }, position: { normalizedStart: 0, normalizedEnd: 10, markdownStart: 0, markdownEnd: 10 } },
      createdByAgentId: "agent-claude",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(now - 2 * HOUR),
      updatedAt: new Date(now - 2 * HOUR),
      comments: [
        { id: "tc1", companyId: "c", threadId: "t-open", issueId: "i", documentId: "d", body: "Worth being more explicit here?", authorType: "agent", authorAgentId: "agent-claude", authorUserId: null, createdByRunId: null, createdAt: new Date(now - 2 * HOUR), updatedAt: new Date(now - 2 * HOUR) },
        { id: "tc2", companyId: "c", threadId: "t-open", issueId: "i", documentId: "d", body: "Agreed. Add an example for the \"no, never proceed\" path.", authorType: "agent", authorAgentId: "agent-cto", authorUserId: null, createdByRunId: null, createdAt: new Date(now - HOUR), updatedAt: new Date(now - HOUR) },
      ],
    },
    {
      id: "t-stale",
      companyId: "c",
      issueId: "i",
      documentId: "d",
      documentKey: "spec",
      status: "open",
      anchorState: "stale",
      anchorConfidence: "fuzzy",
      originalRevisionId: "rev-11",
      originalRevisionNumber: 11,
      currentRevisionId: "rev-12",
      currentRevisionNumber: 12,
      selectedText: "anchored text that drifted",
      prefixText: "",
      suffixText: "",
      normalizedStart: 0,
      normalizedEnd: 10,
      markdownStart: 0,
      markdownEnd: 10,
      anchorSelector: { quote: { exact: "anchored text that drifted", prefix: "", suffix: "" }, position: { normalizedStart: 0, normalizedEnd: 10, markdownStart: 0, markdownEnd: 10 } },
      createdByAgentId: "agent-cto",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(now - 5 * HOUR),
      updatedAt: new Date(now - 5 * HOUR),
      comments: [
        { id: "tc3", companyId: "c", threadId: "t-stale", issueId: "i", documentId: "d", body: "This moved when the intro was rewritten.", authorType: "agent", authorAgentId: "agent-cto", authorUserId: null, createdByRunId: null, createdAt: new Date(now - 5 * HOUR), updatedAt: new Date(now - 5 * HOUR) },
      ],
    },
    {
      id: "t-orphan",
      companyId: "c",
      issueId: "i",
      documentId: "d",
      documentKey: "spec",
      status: "open",
      anchorState: "orphaned",
      anchorConfidence: "missing",
      originalRevisionId: "rev-9",
      originalRevisionNumber: 9,
      currentRevisionId: "rev-12",
      currentRevisionNumber: 12,
      selectedText: "a paragraph that was deleted entirely",
      prefixText: "",
      suffixText: "",
      normalizedStart: 0,
      normalizedEnd: 10,
      markdownStart: 0,
      markdownEnd: 10,
      anchorSelector: { quote: { exact: "a paragraph that was deleted entirely", prefix: "", suffix: "" }, position: { normalizedStart: 0, normalizedEnd: 10, markdownStart: 0, markdownEnd: 10 } },
      createdByAgentId: "agent-claude",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(now - 8 * HOUR),
      updatedAt: new Date(now - 8 * HOUR),
      comments: [
        { id: "tc4", companyId: "c", threadId: "t-orphan", issueId: "i", documentId: "d", body: "Where did this section go?", authorType: "agent", authorAgentId: "agent-claude", authorUserId: null, createdByRunId: null, createdAt: new Date(now - 8 * HOUR), updatedAt: new Date(now - 8 * HOUR) },
      ],
    },
  ],
  reviewThreads: [
    {
      id: "overall",
      companyId: "c",
      issueId: "i",
      documentId: "d",
      documentKey: "spec",
      status: "open",
      createdByAgentId: "agent-cto",
      createdByUserId: null,
      resolvedByAgentId: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(now - 3 * HOUR),
      updatedAt: new Date(now - 3 * HOUR),
      comments: [
        { id: "oc1", companyId: "c", threadId: "overall", issueId: "i", documentId: "d", body: "Suggestions look right — accept the two pending edits and we can ship.", authorType: "agent", authorAgentId: "agent-cto", authorUserId: null, createdByRunId: null, createdAt: new Date(now - 3 * HOUR), updatedAt: new Date(now - 3 * HOUR) },
      ],
    },
  ],
  suggestions: [
    suggestion({ id: "sug-replace", kind: "substitution" }),
    suggestion({ id: "sug-insert", kind: "insertion", insertionPosition: "after", selectedText: "review flow", proposedText: "Also note the orphan-reconciliation pass.", comments: [] }),
    suggestion({ id: "sug-delete", kind: "deletion", selectedText: "This sentence is redundant and should go.", proposedText: null, comments: [] }),
    suggestion({ id: "sug-rebase", kind: "substitution", currentRevisionId: "rev-11", selectedText: "stale base", proposedText: "needs rebase onto rev 12", comments: [] }),
  ],
};

const noop = () => {};
const asyncNoop = async () => {};

const railHandlers = {
  onReplyThread: asyncNoop,
  onToggleThreadResolved: asyncNoop,
  onAddOverallComment: asyncNoop,
  onAcceptSuggestion: asyncNoop,
  onRejectSuggestion: asyncNoop,
  onReplySuggestion: asyncNoop,
  onViewSuggestionDiff: noop,
};

const SAMPLE_BODY = `# Paperclip Documents review flow

The orchestrator should never proceed when a reviewer has left blocking
feedback. Review state and suggested edits are tracked as discrete rows so an
agent and a human read the same index.

## Anchored feedback

Highlighted spans carry comments and suggestions. When the body changes, anchors
remap; drifted anchors are flagged **stale** and lost ones become **orphaned**.`;

const meta: Meta = {
  title: "Documents/Review",
};
export default meta;

type Story = StoryObj;

function DetailHeader() {
  return (
    <header className="px-4 pt-4">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold text-foreground">Paperclip Documents review flow</h1>
        <StatusBadge status="in_review" />
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> Spec
        </span>
        <span className="text-xs text-muted-foreground">Owner: ClaudeCoder</span>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-8"><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
        <Button size="sm" variant="ghost" className="h-8"><Pencil className="mr-1 h-3.5 w-3.5" />Suggest edit</Button>
        <Button size="sm" variant="ghost" className="h-8"><History className="mr-1 h-3.5 w-3.5" />History</Button>
        <Button size="sm" variant="ghost" className="h-8"><Lock className="mr-1 h-3.5 w-3.5" />Lock</Button>
        <Button size="sm" variant="ghost" className="h-8"><Link2 className="mr-1 h-3.5 w-3.5" />Copy link</Button>
      </div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Backlinks:</span>
        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono">PAP-10520</Badge>
        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono">PAP-10522</Badge>
      </div>
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-3 text-[11px] text-muted-foreground">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono">Rev 12</span>
        <span>updated 2h ago by ClaudeCoder</span>
      </div>
    </header>
  );
}

export const DetailDesktop: Story = {
  render: () => (
    <div className="flex h-[680px] w-full overflow-hidden rounded-md border border-border bg-background">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <DetailHeader />
        <div className="px-4 pb-8">
          <div className="mx-auto w-full max-w-[78ch]">
            <MarkdownBody>{SAMPLE_BODY}</MarkdownBody>
          </div>
        </div>
      </div>
      <div className="w-[360px] shrink-0">
        <DocumentReviewRail reviewIndex={reviewIndex} canReview canFinishReview latestRevisionId="rev-12" authorMaps={{ agentMap }} {...railHandlers} />
      </div>
    </div>
  ),
};

export const RailComments: Story = {
  render: () => (
    <div className="h-[680px] w-[360px] overflow-hidden rounded-md border border-border">
      <DocumentReviewRail reviewIndex={reviewIndex} canReview canFinishReview latestRevisionId="rev-12" authorMaps={{ agentMap }} {...railHandlers} />
    </div>
  ),
};

export const RailSuggestions: Story = {
  render: () => (
    <div className="h-[680px] w-[360px] overflow-hidden rounded-md border border-border">
      <DocumentReviewRail reviewIndex={reviewIndex} canReview canFinishReview latestRevisionId="rev-12" initialTab="suggestions" authorMaps={{ agentMap }} {...railHandlers} />
    </div>
  ),
};

export const ConflictBanner: Story = {
  render: () => (
    <div
      role="alert"
      className="m-4 flex max-w-2xl flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">Someone updated this document while you were editing.</span>
      <Button size="sm" variant="outline" className="h-7 text-xs">View their changes</Button>
      <Button size="sm" variant="outline" className="h-7 text-xs">Rebase my draft</Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">Discard mine</Button>
    </div>
  ),
};

export const Suggestions: Story = {
  render: () => (
    <div className="w-[340px] space-y-3 p-4">
      <SuggestionCard suggestion={suggestion({ id: "s-replace", kind: "substitution" })} latestRevisionId="rev-12" canReview authorMaps={{ agentMap }} onAccept={asyncNoop} onReject={asyncNoop} onReply={asyncNoop} />
      <SuggestionCard suggestion={suggestion({ id: "s-insert", kind: "insertion", insertionPosition: "after", selectedText: "review flow", proposedText: "Also note the orphan-reconciliation pass.", comments: [] })} latestRevisionId="rev-12" canReview authorMaps={{ agentMap }} onAccept={asyncNoop} onReject={asyncNoop} onReply={asyncNoop} />
      <SuggestionCard suggestion={suggestion({ id: "s-delete", kind: "deletion", selectedText: "This sentence is redundant.", proposedText: null, comments: [] })} latestRevisionId="rev-12" canReview authorMaps={{ agentMap }} onAccept={asyncNoop} onReject={asyncNoop} onReply={asyncNoop} />
      <SuggestionCard suggestion={suggestion({ id: "s-rebase", kind: "substitution", currentRevisionId: "rev-11", selectedText: "stale base", proposedText: "needs rebase", comments: [] })} latestRevisionId="rev-12" canReview authorMaps={{ agentMap }} onAccept={asyncNoop} onReject={asyncNoop} onReply={asyncNoop} />
    </div>
  ),
};

export const SelectionToolbarStory: Story = {
  name: "Selection toolbar",
  render: () => (
    <div className="p-8">
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-popover px-1 py-1 shadow-md">
        <SelectionToolbar onComment={noop} onSuggest={noop} onCopyLink={noop} />
      </div>
    </div>
  ),
};
