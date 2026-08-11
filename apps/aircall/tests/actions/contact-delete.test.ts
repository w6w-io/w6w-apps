import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /v1/contacts/{id}", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 204 }]);
  const out = await contactDelete.execute({ contactId: "710" }, ctx) as { status: number };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/710");
  assertEquals(out.status, 204);
  assertEquals(logs[0].level, "warn");
});
