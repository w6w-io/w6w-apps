import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/{id} and returns the bare envelope", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "The contact has been deleted." } },
  ]);
  const out = await action.execute({ recordId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/contacts/1");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { code: 0, message: "The contact has been deleted." });
});

Deno.test("contact-delete: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
