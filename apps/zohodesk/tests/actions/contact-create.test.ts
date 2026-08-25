import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts with camelCase field names", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "1" } }]);
  const out = await action.execute({ fields: { lastName: "Carol", email: "c@zylker.com" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { lastName: "Carol", email: "c@zylker.com" });
  assertEquals(out, { id: "1" });
});

Deno.test("contact-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
