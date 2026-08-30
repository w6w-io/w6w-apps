import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/email-send-to-contact.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("email-send-to-contact: POSTs /emails/{id}/contact/{contactId}/send", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  const out = await action.execute!({ emailId: 1, contactId: 47 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/emails/1/contact/47/send");
  assertEquals(out, { success: true });
});

Deno.test("email-send-to-contact: tokens fill {token} placeholders", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute!({ emailId: 1, contactId: 47, tokens: '{"{first_name}": "Jim"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { tokens: { "{first_name}": "Jim" } });
});

Deno.test("email-send-to-contact: is not idempotent — each call sends again", () => {
  assertEquals(action.idempotent, false);
});
