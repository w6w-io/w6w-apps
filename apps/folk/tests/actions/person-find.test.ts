import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-find.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("person-find: GETs the find-by-query path with the query URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  const out = await action.execute({ groupId: "g1", query: "ada@example.com" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/person/find/ada%40example.com`,
  );
  assertEquals(out, { person: { id: "p1" } });
});
