import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-get.ts";

Deno.test("party-get: GETs /parties/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { party: { id: 11587, type: "person" } } }]);
  const out = await action.execute({ partyId: 11587 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/parties/11587");
  assertEquals(out, { party: { id: 11587, type: "person" } });
});

Deno.test("party-get: embed is comma-joined onto the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { party: {} } }]);
  await action.execute({ partyId: 1, embed: ["tags", "organisation"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("embed"), "tags,organisation");
});
