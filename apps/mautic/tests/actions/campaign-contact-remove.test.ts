import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-contact-remove.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("campaign-contact-remove: POSTs /campaigns/{campaignId}/contact/{contactId}/remove", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute!({ campaignId: 3, contactId: 47 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/campaigns/3/contact/47/remove");
});
