import { buildIssueReferenceHref, findIssueReferenceMatches } from "@paperclipai/shared";

type MdastNode = {
  type?: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
};

function replacementNodes(value: string): MdastNode[] {
  const matches = findIssueReferenceMatches(value);
  if (matches.length === 0) return [{ type: "text", value }];

  const nodes: MdastNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.index < cursor) continue;
    if (match.index > cursor) {
      nodes.push({ type: "text", value: value.slice(cursor, match.index) });
    }
    nodes.push({
      type: "link",
      url: buildIssueReferenceHref(match.identifier),
      children: [{ type: "text", value: match.identifier }],
    });
    cursor = match.index + match.length;
  }

  if (cursor < value.length) {
    nodes.push({ type: "text", value: value.slice(cursor) });
  }

  return nodes;
}

function shouldSkipChildren(node: MdastNode): boolean {
  return node.type === "link" || node.type === "inlineCode" || node.type === "code" || node.type === "definition";
}

function visit(node: MdastNode) {
  if (!Array.isArray(node.children) || shouldSkipChildren(node)) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (!child) continue;

    if (child.type === "text" && typeof child.value === "string") {
      const nodes = replacementNodes(child.value);
      if (nodes.length === 1 && nodes[0]?.type === "text") continue;
      node.children.splice(index, 1, ...nodes);
      index += nodes.length - 1;
      continue;
    }

    visit(child);
  }
}

export function remarkIssueReferences() {
  return (tree: MdastNode) => {
    visit(tree);
  };
}
