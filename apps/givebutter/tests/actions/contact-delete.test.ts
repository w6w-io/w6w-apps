import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await contactDelete.execute({ id: "1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/1");
  assertEquals(out, { status: 200 });
});
