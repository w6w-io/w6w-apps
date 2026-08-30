import { assertEquals, assertRejects } from "@std/assert";
import sourceRestore from "../../actions/source-restore.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-restore: POST .../sources/{id}/restore", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", status: "trained" } }]);
  const out = await sourceRestore.execute({ agentId: "a1", sourceId: "s1" }, ctx) as {
    status: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources/s1/restore");
  assertEquals(out.status, "trained");
});

Deno.test("source-restore: surfaces SOURCE_NOT_RESTORABLE when not pending deletion", async () => {
  const { ctx } = mockCtx([
    { status: 409, body: errorBody("SOURCE_NOT_RESTORABLE", "Source is not pending deletion.") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(sourceRestore.execute({ agentId: "a1", sourceId: "s1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("SOURCE_NOT_RESTORABLE"), true, err.message);
});
