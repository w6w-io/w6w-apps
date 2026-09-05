import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /Contacts/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ contactId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Contacts/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
