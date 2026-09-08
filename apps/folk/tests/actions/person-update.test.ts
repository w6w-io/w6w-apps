import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-update.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("person-update: PUTs to the person's endpoint with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  const out = await action.execute({ groupId: "g1", personId: "p1", jobTitle: "CTO" }, ctx);
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/person/p1`,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { jobTitle: "CTO" });
  assertEquals(out, { person: { id: "p1" } });
});
