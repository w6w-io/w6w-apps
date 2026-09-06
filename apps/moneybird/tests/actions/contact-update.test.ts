import { assertEquals } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes /contacts/:id.json with only the fields provided", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ body: { id: "c1" } }]);
  await action.execute({ id: "c1", phone: "020-1234567" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/123/contacts/c1.json");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { contact: { phone: "020-1234567" } });
});
