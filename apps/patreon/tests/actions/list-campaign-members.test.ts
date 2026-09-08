import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-campaign-members.ts";

Deno.test("list-campaign-members: GETs /campaigns/{id}/members and defaults include to currently_entitled_tiers", async () => {
  const body = { data: [{ id: "m1", type: "member" }], meta: { pagination: { total: 1 } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ campaignId: "999" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/campaigns/999/members");
  assertEquals(url.searchParams.get("include"), "currently_entitled_tiers");
  assertEquals(out, body);
});

Deno.test("list-campaign-members: an explicit include overrides the default and carries pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({
    campaignId: "999",
    include: "address,user",
    count: 5,
    cursor: "cur1",
    memberFields: "full_name",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "address,user");
  assertEquals(url.searchParams.get("page[count]"), "5");
  assertEquals(url.searchParams.get("page[cursor]"), "cur1");
  assertEquals(url.searchParams.get("fields[member]"), "full_name");
});
