import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-sms.ts";

Deno.test("send-sms: POSTs form-encoded message to /Accounts/{sid}/Messages.json", async () => {
  const body = { sid: "SM123", status: "queued" };
  const { ctx, calls } = mockCtx([{ body }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  const result = await action.execute!(
    { from: "+14155238886", to: "+14155551212", message: "hello" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2010-04-01/Accounts/AC_test/Messages.json");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("From"), "+14155238886");
  assertEquals(form.get("To"), "+14155551212");
  assertEquals(form.get("Body"), "hello");
  assertEquals(form.get("StatusCallback"), null);

  assertEquals(result, body);
});

Deno.test("send-sms: prefixes numbers with whatsapp: when toWhatsapp is true", async () => {
  const { ctx, calls } = mockCtx([{ body: { sid: "SM456" } }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  await action.execute!(
    {
      from: "+14155238886",
      to: "+14155551212",
      message: "hi",
      toWhatsapp: true,
      statusCallback: "https://example.com/hook",
    },
    ctx,
  );

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("From"), "whatsapp:+14155238886");
  assertEquals(form.get("To"), "whatsapp:+14155551212");
  assertEquals(form.get("StatusCallback"), "https://example.com/hook");
});
