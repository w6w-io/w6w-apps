import { assertEquals } from "@std/assert";
import broadcastGet from "../../actions/broadcast-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("broadcast-get: hits GET /broadcasts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, has_ended: true } }]);
  const out = await broadcastGet.execute({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/broadcasts/1");
  assertEquals(out, { id: 1, has_ended: true });
});
