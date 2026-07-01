import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-create-contacts.ts";

Deno.test("batch-create-contacts: POSTs /crm/v3/objects/contacts/batch/create with all inputs", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "1" }, { id: "2" }] } }]);
  await action.execute!(
    { inputs: [{ properties: { email: "a@x" } }, { properties: { email: "b@x" } }] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/batch/create");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.inputs.length, 2);
  assertEquals(body.inputs[0].properties.email, "a@x");
});
