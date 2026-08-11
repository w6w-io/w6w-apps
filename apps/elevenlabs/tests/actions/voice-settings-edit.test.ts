import { assertEquals } from "@std/assert";
import voiceSettingsEdit from "../../actions/voice-settings-edit.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-settings-edit: posts the settings to the edit path", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  const out = await voiceSettingsEdit.execute(
    { voiceId: "v1", stability: 0.4, similarityBoost: 0.8, useSpeakerBoost: false, speed: 1 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/voices/v1/settings/edit");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBodyOf(calls[0]), {
    stability: 0.4,
    similarity_boost: 0.8,
    // `false` is a real setting, not an omission.
    use_speaker_boost: false,
    speed: 1,
  });
  assertEquals(out, { status: "ok" });
});

/** Zero is a legitimate value for both bounded fields and must not be dropped. */
Deno.test("voice-settings-edit: a zero stability or style survives", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  await voiceSettingsEdit.execute({ voiceId: "v1", stability: 0, style: 0 }, ctx);
  assertEquals(jsonBodyOf(calls[0]), { stability: 0, style: 0 });
});

Deno.test("voice-settings-edit: an omitted field is simply absent from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  await voiceSettingsEdit.execute({ voiceId: "v1" }, ctx);
  assertEquals(jsonBodyOf(calls[0]), {});
});

/** Writing the same settings twice leaves the same state, so a retry is safe. */
Deno.test("voice-settings-edit: is an idempotent perform", () => {
  assertEquals(voiceSettingsEdit.type, "perform");
  assertEquals(voiceSettingsEdit.idempotent, true);
});
