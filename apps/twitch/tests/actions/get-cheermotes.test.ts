import { assertEquals } from "@std/assert";
import getCheermotes from "../../actions/get-cheermotes.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** `broadcaster_id` is optional here, unlike every other channel-scoped read. */
Deno.test("get-cheermotes: calls GET /helix/bits/cheermotes with no query when no broadcaster is given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ prefix: "Cheer", type: "global_first_party", tiers: [{ min_bits: 1 }] }] },
  }]);
  const out = await getCheermotes.execute({}, ctx) as { data: Array<{ prefix: string }> };

  assertEquals(pathOf(calls[0].url), "/helix/bits/cheermotes");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.data[0].prefix, "Cheer");
});

Deno.test("get-cheermotes: a broadcaster ID adds their channel_custom Cheermotes", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ type: "channel_custom" }] } }]);
  await getCheermotes.execute({ broadcasterId: "41245072" }, ctx);
  assertEquals(queryOf(calls[0].url), { broadcaster_id: "41245072" });
});
