import {
  RECENT_SELECTION_DISPLAY_LIMIT,
  readRecentSelectionIds,
  trackRecentSelectionId,
} from "./recent-selections";

const STORAGE_KEY = "paperclip:recent-assignees";

export function getRecentAssigneeIds(): string[] {
  return readRecentSelectionIds(STORAGE_KEY);
}

export function trackRecentAssignee(agentId: string): void {
  trackRecentSelectionId(STORAGE_KEY, agentId);
}

export function sortAgentsByRecency<T extends { id: string; name: string }>(
  agents: T[],
  recentIds: string[],
): T[] {
  const recentIndex = new Map(recentIds.slice(0, RECENT_SELECTION_DISPLAY_LIMIT).map((id, i) => [id, i]));
  return [...agents].sort((a, b) => {
    const aRecent = recentIndex.get(a.id);
    const bRecent = recentIndex.get(b.id);
    if (aRecent !== undefined && bRecent !== undefined) return aRecent - bRecent;
    if (aRecent !== undefined) return -1;
    if (bRecent !== undefined) return 1;
    return a.name.localeCompare(b.name);
  });
}
