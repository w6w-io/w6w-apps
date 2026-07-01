import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-update-contacts.ts";

Deno.test("batch-update-contacts: POSTs /crm/v3/objects/contacts/batch/update", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!(
    { inputs: [{ id: "1", properties: { firstname: "Ada" } }] },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/batch/update");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.inputs[0].id, "1");
  assertEquals(body.inputs[0].properties.firstname, "Ada");
});
