import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-count.ts";

Deno.test("list-count: GETs listsubscriberscount and returns no_of_contacts as noOfContacts", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", no_of_contacts: 2 } },
  ]);
  const out = await action.execute({ listKey: "abc", status: "active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/listsubscriberscount");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(out, { noOfContacts: 2 });
});
