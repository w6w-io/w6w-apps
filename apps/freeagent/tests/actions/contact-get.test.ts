import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { contact: { url: "x" } } }]);
  await action.execute({ contactId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/42");
  assertEquals(calls[0].method, "GET");
});
