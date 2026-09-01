import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, problem } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /v3/contacts/{id} and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ id: 42 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/contacts/42");
  assertEquals(out, { id: 42, deleted: true });
});

/** Idempotent: an already-deleted contact (404) is the same end state as success. */
Deno.test("contact-delete: a 404 (already gone) is treated as success, not an error", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: problem(404, "Not Found", "contact 42 does not exist", "contacts.not-found"),
    },
  ]);
  const out = await contactDelete.execute({ id: 42 }, ctx);
  assertEquals(out, { id: 42, deleted: true });
});

Deno.test("contact-delete: any other failure still throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: problem(500, "Internal Server Error", "boom") }]);
  try {
    await contactDelete.execute({ id: 42 }, ctx);
    throw new Error("expected a throw");
  } catch (err) {
    assertEquals(err instanceof Error && /boom/.test(err.message), true);
  }
});

Deno.test("contact-delete: is idempotent", () => {
  assertEquals(contactDelete.idempotent, true);
});
