import { assertEquals } from "@std/assert";
import voiceDelete from "../../actions/voice-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-delete: issues a DELETE against the voice path", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  const out = await voiceDelete.execute({ voiceId: "v1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/voices/v1");
  assertEquals(out, { status: "ok" });
});

Deno.test("voice-delete: is an idempotent perform — deleting twice changes nothing", () => {
  assertEquals(voiceDelete.type, "perform");
  assertEquals(voiceDelete.idempotent, true);
});
