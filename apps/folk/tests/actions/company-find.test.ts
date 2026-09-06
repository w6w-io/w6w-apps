import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-find.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("company-find: GETs the find-by-query path with the query URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const out = await action.execute({ groupId: "g1", query: "Acme & Co" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/company/find/Acme%20%26%20Co`,
  );
  assertEquals(out, { company: { id: "c1" } });
});
