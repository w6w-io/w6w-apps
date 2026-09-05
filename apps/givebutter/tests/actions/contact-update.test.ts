import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

/**
 * Update's emails/phones are the RICH object shape, unlike create's plain
 * strings — this is the assertion that would fail if the two ever got
 * conflated.
 */
Deno.test("contact-update: emails/phones are sent as {value, type, is_primary} objects", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactUpdate.execute(
    {
      id: "1",
      emails: '[{"value":"a@x.com","type":"home","is_primary":true}]',
      remove_phones: "555-1000, 555-2000",
    },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emails, [{ value: "a@x.com", type: "home", is_primary: true }]);
  assertEquals(body.remove_phones, ["555-1000", "555-2000"]);
});

Deno.test("contact-update: sends no body fields beyond what was set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1" }) }]);
  await contactUpdate.execute({ id: "1", note: "called back" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { note: "called back" });
});
