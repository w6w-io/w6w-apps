import { assertEquals } from "@std/assert";
import getChannelInformation from "../../actions/get-channel-information.ts";
import { mockCtx, page, pathOf, queryAll } from "../_helpers.ts";

Deno.test("get-channel-information: calls GET /helix/channels", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ broadcaster_id: "141981764" }]) }]);
  const out = await getChannelInformation.execute({ broadcasterId: "141981764" }, ctx) as {
    data: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/helix/channels");
  assertEquals(queryAll(calls[0].url, "broadcaster_id"), ["141981764"]);
  assertEquals(out.data.length, 1);
});

Deno.test("get-channel-information: up to 100 broadcaster IDs go as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getChannelInformation.execute({ broadcasterId: ["1", "2", "3"] }, ctx);
  assertEquals(queryAll(calls[0].url, "broadcaster_id"), ["1", "2", "3"]);
});
