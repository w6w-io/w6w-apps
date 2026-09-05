import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/orgunit-get.ts";

Deno.test("orgunit-get: GETs the org unit path with slashes preserved unescaped", async () => {
  const body = { orgUnitPath: "/Sales/Support" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ orgUnitPath: "/Sales/Support" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits/Sales/Support");
  assertEquals(result, body);
});

Deno.test("orgunit-get: accepts the path without a leading slash too", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ orgUnitPath: "Sales/Support" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits/Sales/Support");
});

Deno.test("orgunit-get: honors a custom customerId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ customerId: "C123", orgUnitPath: "Sales" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/C123/orgunits/Sales");
});
