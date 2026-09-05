import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-subscribe.ts";

Deno.test("contact-subscribe: POSTs json/listsubscribe with contactinfo JSON-encoded as a query param", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: { status: "success", code: "0", message: "A confirmation email is sent to the user." },
    },
  ]);
  const out = await action.execute(
    { listKey: "abc", contactInfo: { "Contact Email": "jai@zoho.com" }, source: "signup" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/json/listsubscribe");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(JSON.parse(url.searchParams.get("contactinfo")!), {
    "Contact Email": "jai@zoho.com",
  });
  assertEquals(url.searchParams.get("source"), "signup");
  assertEquals(out, { message: "A confirmation email is sent to the user." });
});

Deno.test("contact-subscribe: accepts a JSON string for contactInfo too", async () => {
  const { ctx, calls } = mockCampaignsCtx([{ body: { status: "success", code: "0" } }]);
  await action.execute(
    { listKey: "abc", contactInfo: '{"Contact Email":"jai@zoho.com"}' },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(JSON.parse(url.searchParams.get("contactinfo")!), {
    "Contact Email": "jai@zoho.com",
  });
});
