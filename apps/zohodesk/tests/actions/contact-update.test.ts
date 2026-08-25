import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PATCHes /contacts/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "7", phone: "123" } }]);
  const out = await action.execute({ recordId: "7", fields: { phone: "123" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/7");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out, { id: "7", phone: "123" });
});

Deno.test("contact-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
