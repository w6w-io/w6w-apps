import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-add-bulk.ts";

Deno.test("contact-add-bulk: POSTs addlistsubscribersinbulk with the list key and email ids", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", listkey: "abc", listname: "My List" } },
  ]);
  const out = await action.execute({ listKey: "abc", emailIds: "a@b.com,c@d.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/addlistsubscribersinbulk");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("emailids"), "a@b.com,c@d.com");
  assertEquals(out, { listKey: "abc", listName: "My List" });
});
