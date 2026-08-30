import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs /v1/contacts nesting default fields under defaultFields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "c1" } } }]);
  await contactCreate.execute(
    {
      firstName: "John",
      lastName: "Doe",
      emails: [{ name: "work", value: "john@example.com" }],
      externalId: "crm-1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.defaultFields.firstName, "John");
  assertEquals(body.defaultFields.lastName, "Doe");
  assertEquals(body.defaultFields.emails, [{ name: "work", value: "john@example.com" }]);
  assertEquals(body.externalId, "crm-1");
});

Deno.test("contact-create: is a non-idempotent perform action", () => {
  assertEquals(contactCreate.type, "perform");
  assertEquals(contactCreate.idempotent, false);
});
