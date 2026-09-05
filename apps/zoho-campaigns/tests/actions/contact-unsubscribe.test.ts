import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-unsubscribe.ts";

Deno.test("contact-unsubscribe: POSTs json/listunsubscribe with contactinfo JSON-encoded", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", message: "User successfully unsubscribed." } },
  ]);
  const out = await action.execute(
    { listKey: "abc", contactInfo: { "Contact Email": "jai@zoho.com" } },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/json/listunsubscribe");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(JSON.parse(url.searchParams.get("contactinfo")!), {
    "Contact Email": "jai@zoho.com",
  });
  assertEquals(out, { message: "User successfully unsubscribed." });
});
