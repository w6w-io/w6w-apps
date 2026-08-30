import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-dnc-remove.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-dnc-remove: POSTs /contacts/{id}/dnc/{channel}/remove", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contact: { id: 1 } } }], conn);
  await action.execute!({ contactId: 1, channel: "sms" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/dnc/sms/remove");
});

Deno.test("contact-dnc-remove: channel defaults to email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ contactId: 1 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/dnc/email/remove");
});
