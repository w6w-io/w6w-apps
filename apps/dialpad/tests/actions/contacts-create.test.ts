import { assertEquals } from "@std/assert";
import contactsCreate from "../../actions/contacts-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contacts-create: POSTs /contacts and splits comma lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }]);
  await contactsCreate.execute(
    { firstName: "Jane", lastName: "Doe", phones: "+14155550100, +14155550101" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Jane");
  assertEquals(body.phones, ["+14155550100", "+14155550101"]);
});

Deno.test("contacts-create: declared non-idempotent", () => {
  assertEquals(contactsCreate.idempotent, false);
});
