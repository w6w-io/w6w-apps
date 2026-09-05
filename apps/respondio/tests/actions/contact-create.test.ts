import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs /contact/{identifier} with compacted fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { code: "0", message: "created" } }]);
  const out = await contactCreate.execute(
    { identifier: "email:ada@example.com", firstName: "Ada", lastName: "" },
    ctx,
  ) as { message: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/contact/email:ada@example.com");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { firstName: "Ada" });
  assertEquals(out.message, "created");
});

Deno.test("contact-create: maps customFields to the wire's custom_fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { code: "0", message: "created" } }]);
  await contactCreate.execute(
    {
      identifier: "phone:+60123456789",
      firstName: "Ada",
      customFields: [{ name: "Plan", value: "Pro" }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.custom_fields, [{ name: "Plan", value: "Pro" }]);
});

Deno.test("contact-create: an id: identifier is refused — you cannot choose a contact's own id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactCreate.execute({ identifier: "id:1", firstName: "Ada" }, ctx),
    Error,
    'not "id:"',
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: is not idempotent", () => {
  assertEquals(contactCreate.idempotent, false);
});
