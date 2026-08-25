import { assertEquals } from "@std/assert";
import messageStatusGet from "../../actions/message-status-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("message-status-get: GETs the bare /api/status path with a handle query param", async () => {
  const { ctx, calls } = mockCtx([{ body: { message_handle: "m1", status: "SENT" } }]);
  const out = await messageStatusGet.execute({ handle: "m1" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/status");
  assertEquals(queryOf(calls[0].url), { handle: "m1" });
  // Bare response — no {"data": ...} envelope, unlike /api/v2/messages/{id}.
  assertEquals(out.status, "SENT");
});
