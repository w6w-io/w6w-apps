import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs /contacts/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 200 }]);
  const out = await action.execute({ contactId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/42");
  assertEquals(out, {});
});
