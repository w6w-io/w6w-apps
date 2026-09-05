import { assertEquals, assertRejects } from "@std/assert";
import spaceChannelTemplateList from "../../actions/space-channel-template-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-channel-template-list: GETs /space/channel/{channelId}/template", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, name: "order_confirmation" }]) }]);
  const out = await spaceChannelTemplateList.execute(
    { channelId: 12345 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/space/channel/12345/template");
  assertEquals(out.items.length, 1);
});

Deno.test("space-channel-template-list: a missing channelId is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await spaceChannelTemplateList.execute(
        { channelId: undefined as unknown as number },
        ctx,
      ),
    Error,
    "Channel ID is required",
  );
  assertEquals(calls.length, 0);
});
