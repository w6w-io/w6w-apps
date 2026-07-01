import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-delete-contacts.ts";

Deno.test("batch-delete-contacts: POSTs /crm/v3/objects/contacts/batch/archive with ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ ids: ["1", "2", "3"] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/batch/archive");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.inputs.length, 3);
  assertEquals(body.inputs[0].id, "1");
  assertEquals(out, { archived: 3 });
});
