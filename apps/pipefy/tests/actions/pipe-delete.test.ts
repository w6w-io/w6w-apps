import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import pipeDelete from "../../actions/pipe-delete.ts";

Deno.test("pipe-delete: deletes and returns success", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deletePipe: { success: true } } } }]);
  const out = await pipeDelete.execute({ id: "1" }, ctx) as { success: boolean };
  assertEquals(out.success, true);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(q, "mutation { deletePipe(input: { id: 1 }) { success } }");
});

Deno.test("pipe-delete: throws when success is false", async () => {
  const { ctx } = mockCtx([{ body: { data: { deletePipe: { success: false } } } }]);
  let threw = false;
  try {
    await pipeDelete.execute({ id: "1" }, ctx);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("deletePipe"));
  }
  assert(threw);
});

Deno.test("pipe-delete: type/resource/idempotency metadata", () => {
  assertEquals(pipeDelete.type, "perform");
  assertEquals(pipeDelete.resource, "pipe");
  assertEquals(pipeDelete.idempotent, true);
});
