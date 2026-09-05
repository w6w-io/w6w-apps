import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-info.ts";

Deno.test("contacts-info: POSTs contacts.info with {id} and returns the contact", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "1", first_name: "Erlich" } },
  }]);
  const out = await action.execute({ id: "1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts.info");
  assertEquals(JSON.parse(calls[0].body!), { id: "1" });
  assertEquals(out, { contact: { id: "1", first_name: "Erlich" } });
});

Deno.test("contacts-info: passes includes through when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await action.execute({ id: "1", includes: "custom_fields" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { id: "1", includes: "custom_fields" });
});
