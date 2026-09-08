import { assertEquals } from "@std/assert";
import createContact from "../../actions/create-contact.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("create-contact: is a non-idempotent perform action", () => {
  assertEquals(createContact.type, "perform");
  assertEquals(createContact.idempotent, false);
});

Deno.test("create-contact: splits comma-separated phone/email and wires accountId", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 12, name: "Andy Fowler" } }]);
  await createContact.execute({
    name: "Andy Fowler",
    phone: "717-555-0480, 877-555-5555",
    email: "andy@gmail.com",
    accountId: "111",
  }, ctx);

  const contact = rpcBody(calls[0]).params.contact as Record<string, unknown>;
  assertEquals(contact.name, "Andy Fowler");
  assertEquals(contact.phone, ["717-555-0480", "877-555-5555"]);
  assertEquals(contact.email, ["andy@gmail.com"]);
  assertEquals(contact.accounts, [{ id: "111" }]);
});
