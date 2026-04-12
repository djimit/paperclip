import { describe, expect, it, vi } from "vitest";
import { memoryService } from "../services/memory.js";

describe("memoryService.forget", () => {
  it("rejects record sets that span multiple bindings", async () => {
    const rows = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        bindingId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        bindingId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
    ];

    const where = vi.fn().mockResolvedValue(rows);
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where }),
      }),
      update: vi.fn(),
    } as any;

    await expect(
      memoryService(db).forget(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        {
          recordIds: rows.map((row) => row.id),
          scope: {},
        },
        {
          actorType: "user",
          actorId: "board-user",
          agentId: null,
          userId: "board-user",
          runId: null,
        },
      ),
    ).rejects.toThrow("Memory records must belong to the same binding");

    expect(where).toHaveBeenCalledOnce();
    expect(db.update).not.toHaveBeenCalled();
  });
});
