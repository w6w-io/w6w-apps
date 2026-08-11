import { assertEquals } from "@std/assert";
import voiceAddFromLibrary from "../../actions/voice-add-from-library.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-add-from-library: posts to the owner/voice path with the new name", async () => {
  const { ctx, calls } = mockCtx([{ body: { voice_id: "new1" } }]);
  const out = await voiceAddFromLibrary.execute(
    { publicOwnerId: "owner1", voiceId: "lib1", newName: "My Narrator" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/voices/add/owner1/lib1");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBodyOf(calls[0]), { new_name: "My Narrator" });
  // The copy gets a NEW id — using the library id afterwards fails.
  assertEquals(out, { voice_id: "new1" });
});

/** `bookmarked` defaults to true server-side, so only the opt-out travels. */
Deno.test("voice-add-from-library: the bookmark flag is only sent when turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await voiceAddFromLibrary.execute(
    { publicOwnerId: "o", voiceId: "v", newName: "n", bookmarked: true },
    ctx,
  );
  assertEquals(jsonBodyOf(calls[0]), { new_name: "n" });
  await voiceAddFromLibrary.execute(
    { publicOwnerId: "o", voiceId: "v", newName: "n", bookmarked: false },
    ctx,
  );
  assertEquals(jsonBodyOf(calls[1]), { new_name: "n", bookmarked: false });
});

Deno.test("voice-add-from-library: both path segments are escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await voiceAddFromLibrary.execute(
    { publicOwnerId: "o/1", voiceId: "v?2", newName: "n" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/voices/add/o%2F1/v%3F2");
});

/** Adding spends a voice slot and an add/edit allowance — a retry costs both. */
Deno.test("voice-add-from-library: is a non-idempotent perform", () => {
  assertEquals(voiceAddFromLibrary.type, "perform");
  assertEquals(voiceAddFromLibrary.idempotent, false);
});
