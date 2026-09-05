import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/orgunit-insert.ts";

Deno.test("orgunit-insert: POSTs /customer/my_customer/orgunits", async () => {
  const body = { orgUnitId: "id:1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({
    name: "Support",
    parentOrgUnitPath: "/Sales",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits");
  assertEquals(JSON.parse(calls[0].body!), { name: "Support", parentOrgUnitPath: "/Sales" });
  assertEquals(result, body);
});

Deno.test("orgunit-insert: forwards a description and custom customerId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    customerId: "C123",
    name: "Support",
    parentOrgUnitPath: "/",
    description: "Support team",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/C123/orgunits");
  assertEquals(JSON.parse(calls[0].body!).description, "Support team");
});

Deno.test("orgunit-insert: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
