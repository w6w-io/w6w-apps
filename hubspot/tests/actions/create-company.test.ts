import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-company.ts";

Deno.test("create-company: POSTs /crm/v3/objects/companies with name + optionals", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ name: "Acme", domain: "acme.co", numberofemployees: 42 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/companies");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.name, "Acme");
  assertEquals(body.properties.domain, "acme.co");
  assertEquals(body.properties.numberofemployees, "42");
});
