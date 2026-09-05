import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-do-not-mail.ts";

Deno.test("contact-do-not-mail: POSTs json/contactdonotmail with contactinfo JSON-encoded, no listkey", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { code: "0", message: "User successfully moved to Do-Not-Mail." } },
  ]);
  const out = await action.execute({ contactInfo: { "Contact Email": "xxx@zoho.com" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/json/contactdonotmail");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.has("listkey"), false);
  assertEquals(JSON.parse(url.searchParams.get("contactinfo")!), {
    "Contact Email": "xxx@zoho.com",
  });
  assertEquals(out, { message: "User successfully moved to Do-Not-Mail." });
});
