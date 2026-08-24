import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { envelope, mockCtx } from "../_helpers.ts";

Deno.test("contact-create: POSTs a Person contact with name required alongside first/last", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await contactCreate.execute(
    { type: "Person", name: "Jane Doe", firstName: "Jane", lastName: "Doe" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "Person", name: "Jane Doe", first_name: "Jane", last_name: "Doe" },
  });
});

/**
 * `primary_email_address` is a read-only projection — see this action's own
 * doc comment. Writing an email means sending `email_addresses[]`.
 */
Deno.test("contact-create: an email input is written as a default email_addresses entry", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await contactCreate.execute({ type: "Company", name: "Acme LLP", email: "hi@acme.test" }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.email_addresses, [{ address: "hi@acme.test", default_email: true }]);
  assertEquals("primary_email_address" in body, false);
});

Deno.test("contact-create: a phone input is written as a default phone_numbers entry", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await contactCreate.execute({ type: "Company", name: "Acme LLP", phone: "+15550100" }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.phone_numbers, [{ number: "+15550100", default_number: true }]);
});
