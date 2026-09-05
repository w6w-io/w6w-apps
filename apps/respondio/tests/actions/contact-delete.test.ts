import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /contact/{identifier}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contactId: 1 } }]);
  const out = await contactDelete.execute({ identifier: "id:1" }, ctx) as { contactId: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1");
  assertEquals(out.contactId, 1);
});

Deno.test("contact-delete: is declared idempotent", () => {
  assertEquals(contactDelete.idempotent, true);
});
