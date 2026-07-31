export function escapeMarkdownLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/[[\]]/g, "\\$&").replace(/[\r\n]/g, " ");
}

export function escapeMarkdownDestination(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&").replace(/[\r\n]/g, "");
}

export function escapeMarkdownTitle(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ");
}
