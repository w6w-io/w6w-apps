import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes /contacts/{id}.json with only the set fields", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  await contactUpdate.execute({ id: 3, name: "New Name" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts/3.json");
  assertEquals(JSON.parse(calls[0].body!), { data: { name: "New Name" } });
});

Deno.test("contact-update: an email input replaces the default email_addresses entry", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3 }) }]);
  await contactUpdate.execute({ id: 3, email: "new@acme.test" }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.email_addresses, [{ address: "new@acme.test", default_email: true }]);
});
