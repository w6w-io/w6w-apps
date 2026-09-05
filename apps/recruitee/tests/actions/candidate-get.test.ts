import { assertEquals } from "@std/assert";
import candidateGet from "../../actions/candidate-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-get: fetches by id", async () => {
  const candidate = { id: 42, name: "Jane Doe" };
  const { ctx, calls } = mockCtx([{ status: 200, body: { candidate, references: [] } }]);
  const out = await candidateGet.execute({ candidateId: 42 }, ctx) as { candidate: unknown };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates/42");
  assertEquals(out.candidate, candidate);
});
