import { assertEquals } from "@std/assert";
import voiceSettingsGet from "../../actions/voice-settings-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-settings-get: reads the per-voice settings path", async () => {
  const settings = { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true };
  const { ctx, calls } = mockCtx([{ body: settings }]);
  assertEquals(await voiceSettingsGet.execute({ voiceId: "v1" }, ctx), settings);
  assertEquals(pathOf(calls[0].url), "/v1/voices/v1/settings");
  assertEquals(calls[0].method, "GET");
});
