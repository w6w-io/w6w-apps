import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-company.ts";

Deno.test("update-company: PATCHes /crm/v3/objects/companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ id: "c1", properties: { name: "New" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/companies/c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.name, "New");
});
