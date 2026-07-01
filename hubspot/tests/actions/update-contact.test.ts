import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-contact.ts";

Deno.test("update-contact: PATCHes /crm/v3/objects/contacts/{id} with a properties body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ id: "1", properties: { firstname: "Ada", age: 40 } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/contacts/1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.firstname, "Ada");
  assertEquals(body.properties.age, "40");
});
