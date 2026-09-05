import { assertEquals } from "@std/assert";
import candidateDelete from "../../actions/candidate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-delete: DELETEs the candidate by id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { candidate: { id: 9, deleted_at: "2026-09-05T00:00:00Z" } } },
  ]);
  const out = await candidateDelete.execute({ candidateId: 9 }, ctx) as {
    candidate: { id: number };
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates/9");
  assertEquals(out.candidate.id, 9);
});
