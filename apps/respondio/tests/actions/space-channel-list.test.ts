import { assertEquals } from "@std/assert";
import spaceChannelList from "../../actions/space-channel-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-channel-list: GETs /space/channel", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, source: "whatsapp" }]) }]);
  const out = await spaceChannelList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/space/channel");
  assertEquals(out.items.length, 1);
});
