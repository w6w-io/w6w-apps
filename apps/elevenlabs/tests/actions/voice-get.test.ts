import { assertEquals } from "@std/assert";
import voiceGet from "../../actions/voice-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("voice-get: reads one voice by id", async () => {
  const voice = { voice_id: "v1", name: "Roger", category: "premade", labels: { accent: "us" } };
  const { ctx, calls } = mockCtx([{ body: voice }]);
  assertEquals(await voiceGet.execute({ voiceId: "v1" }, ctx), voice);
  assertEquals(pathOf(calls[0].url), "/v1/voices/v1");
  assertEquals(calls[0].method, "GET");
});

/** `with_settings` is documented as deprecated and ignored, so it is never sent. */
Deno.test("voice-get: does not send the deprecated with_settings parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await voiceGet.execute({ voiceId: "v1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals((voiceGet.params ?? []).map((p) => p.key), ["voiceId"]);
});

Deno.test("voice-get: an id with path characters is escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await voiceGet.execute({ voiceId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/voices/a%2Fb");
});
