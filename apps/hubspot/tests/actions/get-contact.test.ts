import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contact.ts";

Deno.test("get-contact: GETs /crm/v3/objects/contacts/{id} with parsed CSV props", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", properties: { email: "a@x" } } }]);
  const out = await action.execute!(
    { id: "1", properties: "email,firstname", idProperty: "email" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/crm/v3/objects/contacts/1");
  assertEquals(url.searchParams.getAll("properties"), ["email", "firstname"]);
  assertEquals(url.searchParams.get("idProperty"), "email");
  assertEquals((out as { id: string }).id, "1");
});
