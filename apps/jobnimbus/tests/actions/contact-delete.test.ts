import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: PUTs {is_active: false} — a soft delete, not a DELETE verb", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "a1", is_active: false } }]);
  const out = await contactDelete.execute({ jnid: "a1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/contacts/a1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { is_active: false });
  assertEquals(out, { jnid: "a1", is_active: false });
});

Deno.test("contact-delete: is marked idempotent — deactivating twice is a no-op the second time", () => {
  assertEquals(contactDelete.idempotent, true);
});
