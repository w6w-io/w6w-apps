import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PATCHes /contacts/{id} with only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CTC-1" } }]);
  await action.execute({ id: "CTC-1", company: "Acme Inc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/CTC-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { company: "Acme Inc" });
});

Deno.test("contact-update: never sends email or mobile_phone (not updatable via this endpoint)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "CTC-1", city: "New York" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("email" in body, false);
  assertEquals("mobile_phone" in body, false);
});
