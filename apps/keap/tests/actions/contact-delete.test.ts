import { assertEquals, assertRejects } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { apiErrorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs the contact and returns the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ contactId: "42" }, ctx) as { status: number };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/contacts/42");
  assertEquals(calls[0].body, null);
  assertEquals(out.status, 204);
});

Deno.test("contact-delete: a 404 on a second delete surfaces as an error, not a silent success", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: apiErrorBody(404, "Contact not found", "NOT_FOUND"),
  }]);
  await assertRejects(
    async () => await contactDelete.execute({ contactId: "42" }, ctx),
    Error,
    "NOT_FOUND",
  );
});

Deno.test("contact-delete: is declared idempotent", () => {
  assertEquals(contactDelete.idempotent, true);
});
