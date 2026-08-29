import { assertEquals } from "@std/assert";
import voiceGet from "../../actions/voice-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-get: fetches by id and unwraps the voice record", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { voice: { id: "v-1", name: "maya" } } }]);
  const out = await voiceGet.execute({ voiceId: "maya" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/voices/maya");
  assertEquals(out.voice, { id: "v-1", name: "maya" });
});

Deno.test("voice-get: accepts a UUID voice id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { voice: {} } }]);
  await voiceGet.execute({ voiceId: "d4610ec1-933d-44c9-a05f-53df2437808d" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/voices/d4610ec1-933d-44c9-a05f-53df2437808d");
});
