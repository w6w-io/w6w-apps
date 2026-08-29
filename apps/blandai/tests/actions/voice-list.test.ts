import { assertEquals } from "@std/assert";
import voiceList from "../../actions/voice-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("voice-list: fetches /v1/voices and unwraps voices", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { voices: [{ id: "v-1", name: "maya" }] },
  }]);
  const out = await voiceList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/voices");
  assertEquals(out.voices, [{ id: "v-1", name: "maya" }]);
});

Deno.test("voice-list: defaults to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await voiceList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.voices, []);
});
