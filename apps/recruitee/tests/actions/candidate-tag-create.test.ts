import { assertEquals } from "@std/assert";
import candidateTagCreate from "../../actions/candidate-tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-tag-create: POSTs `{tag}` to the candidate's tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tags: [{ id: 1, name: "Developer" }] } }]);
  await candidateTagCreate.execute({ candidateId: 8, tag: "Developer" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates/8/tags");
  assertEquals(JSON.parse(calls[0].body!), { tag: "Developer" });
});

Deno.test("candidate-tag-create: declared idempotent — Recruitee reuses the existing tag by name", () => {
  assertEquals(candidateTagCreate.idempotent, true);
});
