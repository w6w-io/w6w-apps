import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/list-advanced-details.ts";

Deno.test("list-advanced-details: GETs getlistadvanceddetails and returns the parsed body as data", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        filtertype: "sentcampaigns",
        local_subscribers: { INDIA: 1 },
      },
    },
  ]);
  const out = await action.execute({ listKey: "abc", filterType: "sentcampaigns" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getlistadvanceddetails");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("filtertype"), "sentcampaigns");
  assertEquals(out, {
    data: {
      status: "success",
      code: "0",
      filtertype: "sentcampaigns",
      local_subscribers: { INDIA: 1 },
    },
  });
});
