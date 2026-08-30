import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-contact-add.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("campaign-contact-add: POSTs /campaigns/{campaignId}/contact/{contactId}/add", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  const out = await action.execute!({ campaignId: 3, contactId: 47 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/campaigns/3/contact/47/add");
  assertEquals(out, { success: true });
});
