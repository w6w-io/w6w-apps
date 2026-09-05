import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/orgunit-list.ts";

Deno.test("orgunit-list: GETs /customer/my_customer/orgunits with defaults", async () => {
  const body = { organizationUnits: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits");
  assertEquals(url.searchParams.get("orgUnitPath"), "/");
  assertEquals(url.searchParams.get("type"), "children");
  assertEquals(result, body);
});

Deno.test("orgunit-list: forwards a custom customerId, path and scope", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ customerId: "C123", orgUnitPath: "/Sales", type: "all" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/C123/orgunits");
  assertEquals(url.searchParams.get("orgUnitPath"), "/Sales");
  assertEquals(url.searchParams.get("type"), "all");
});
