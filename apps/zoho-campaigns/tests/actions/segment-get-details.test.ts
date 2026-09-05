import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/segment-get-details.ts";

Deno.test("segment-get-details: GETs getsegmentdetails with the list key and cvid", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", segment_details: { criteria: [] } } },
  ]);
  const out = await action.execute({ listKey: "abc", cvid: "303000014567003" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getsegmentdetails");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("cvid"), "303000014567003");
  assertEquals(out, { data: { status: "success", code: "0", segment_details: { criteria: [] } } });
});
