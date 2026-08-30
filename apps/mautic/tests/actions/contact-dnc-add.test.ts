import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-dnc-add.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-dnc-add: POSTs /contacts/{id}/dnc/{channel}/add, defaulting to email", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { channelId: null, reason: "Integration issued DNC", comments: "" } },
  ], conn);
  await action.execute!({ contactId: 1 }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/dnc/email/add");
  assertEquals(JSON.parse(calls[0].body!).reason, "3");
});

Deno.test("contact-dnc-add: a chosen channel and reason are sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ contactId: 1, channel: "sms", reason: "1", comments: "opted out" }, ctx);
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/dnc/sms/add");
  assertEquals(JSON.parse(calls[0].body!), { reason: "1", comments: "opted out" });
});
