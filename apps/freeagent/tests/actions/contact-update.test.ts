import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs /contacts/:id with a root `contact` object", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { contact: { url: "x" } } }]);
  await action.execute({ contactId: "42", email: "new@example.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/42");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { contact: { email: "new@example.com" } });
});
