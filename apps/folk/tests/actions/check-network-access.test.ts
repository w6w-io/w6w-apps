import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-network-access.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("check-network-access: GETs check-access and returns {ok}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/check-access`);
  assertEquals(out, { ok: true });
});
