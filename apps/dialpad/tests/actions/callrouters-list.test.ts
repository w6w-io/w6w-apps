import { assertEquals } from "@std/assert";
import callroutersList from "../../actions/callrouters-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

const ROUTER = {
  id: "1",
  name: "Router",
  signature: { algo: "HS256", secret: "live-secret", type: "jwt" },
};

Deno.test("callrouters-list: GETs /callrouters and strips the signing secret from every item", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([ROUTER]) }]);
  const out = await callroutersList.execute({ officeId: "5" }, ctx) as {
    items: Array<{ signature: { secret?: string; algo?: string } }>;
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/callrouters");
  assertEquals(queryOf(calls[0].url), { office_id: "5" });
  assertEquals(out.items[0].signature.secret, undefined);
  assertEquals(out.items[0].signature.algo, "HS256");
});
