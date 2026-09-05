import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-delete: calls DELETE /1/Contact?id=... and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0, account_id: "12345" } }]);
  const out = await contactDelete.execute({ id: "4" }, ctx) as { deleted: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/1/Contact");
  assertEquals(queryOf(calls[0].url), { id: "4" });
  assertEquals(out.deleted, true);
});
