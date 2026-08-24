import { assertEquals } from "@std/assert";
import voiceList from "../../actions/voice-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("voice-list: filters by engine to find Starfish-compatible voices", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ voice_id: "v1", name: "Sara", type: "public" }]) },
  ]);
  const out = await voiceList.execute({ engine: "starfish" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/voices");
  assertEquals(queryOf(calls[0].url), { engine: "starfish" });
  assertEquals(out, {
    items: [{ voice_id: "v1", name: "Sara", type: "public" }],
    hasMore: false,
    nextToken: null,
  });
});
