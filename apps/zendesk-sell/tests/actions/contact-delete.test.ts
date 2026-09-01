import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /v2/contacts/:id and expects 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ id: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contacts/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
