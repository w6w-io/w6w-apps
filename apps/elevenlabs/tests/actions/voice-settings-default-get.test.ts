import { assertEquals } from "@std/assert";
import voiceSettingsDefaultGet from "../../actions/voice-settings-default-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-settings-default-get: reads the platform default settings", async () => {
  const settings = { stability: 0.5, similarity_boost: 0.75 };
  const { ctx, calls } = mockCtx([{ body: settings }]);
  assertEquals(await voiceSettingsDefaultGet.execute({}, ctx), settings);
  assertEquals(pathOf(calls[0].url), "/v1/voices/settings/default");
});

/** It takes no parameters at all, which is what makes it safe to invoke with {}. */
Deno.test("voice-settings-default-get: declares no parameters", () => {
  assertEquals(voiceSettingsDefaultGet.params, []);
  assertEquals(voiceSettingsDefaultGet.type, "read");
});
