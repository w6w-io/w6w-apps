import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1" } }]);
  await contactUpdate.execute({ jnid: "a1", city: "Orlando", zip: "32806" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts/a1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { city: "Orlando", zip: "32806" });
});

Deno.test("contact-update: jnid never leaks into the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactUpdate.execute({ jnid: "a1", city: "Orlando" }, ctx);
  assertEquals("jnid" in JSON.parse(calls[0].body!), false);
});

Deno.test("contact-update: is marked idempotent — repeating the same PUT is safe", () => {
  assertEquals(contactUpdate.idempotent, true);
});
