import { assertEquals } from "@std/assert";
import searchChannels from "../../actions/search-channels.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-channels: calls GET /helix/search/channels", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "141981764", is_live: false }]) }]);
  const out = await searchChannels.execute({ query: "twitchdev" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/helix/search/channels");
  assertEquals(queryOf(calls[0].url), { query: "twitchdev" });
  assertEquals(out.data.length, 1);
});

/**
 * `live_only` changes what Twitch MATCHES on, not just what it filters, so both
 * states have to be expressible — an unset flag is a third, distinct request.
 */
Deno.test("search-channels: live_only is sent as true or false, and omitted when unset", async () => {
  const on = mockCtx([{ body: page([]) }]);
  await searchChannels.execute({ query: "a_seagull", liveOnly: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url).live_only, "true");

  const off = mockCtx([{ body: page([]) }]);
  await searchChannels.execute({ query: "a_seagull", liveOnly: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url).live_only, "false");

  const unset = mockCtx([{ body: page([]) }]);
  await searchChannels.execute({ query: "a_seagull" }, unset.ctx);
  assertEquals("live_only" in queryOf(unset.calls[0].url), false);
});
