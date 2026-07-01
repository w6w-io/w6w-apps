import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/make-call.ts";

Deno.test("make-call: wraps plain message in TwiML <Say> and POSTs to /Calls.json", async () => {
  const body = { sid: "CA123", status: "queued" };
  const { ctx, calls } = mockCtx([{ body }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  const result = await action.execute!(
    { from: "+14155238886", to: "+14155551212", message: "Hello & welcome" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2010-04-01/Accounts/AC_test/Calls.json");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("From"), "+14155238886");
  assertEquals(form.get("To"), "+14155551212");
  assertEquals(
    form.get("Twiml"),
    "<Response><Say>Hello &amp; welcome</Say></Response>",
  );

  assertEquals(result, body);
});

Deno.test("make-call: passes raw message through when twiml is true", async () => {
  const { ctx, calls } = mockCtx([{ body: { sid: "CA456" } }], {
    connection: { display: { accountSid: "AC_test" } },
  });

  const rawTwiml = "<Response><Play>https://example.com/hold.mp3</Play></Response>";
  await action.execute!(
    { from: "+14155238886", to: "+14155551212", message: rawTwiml, twiml: true },
    ctx,
  );

  const form = new URLSearchParams(calls[0].body ?? "");
  assertEquals(form.get("Twiml"), rawTwiml);
});
