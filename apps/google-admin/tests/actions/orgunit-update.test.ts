import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/orgunit-update.ts";

Deno.test("orgunit-update: PATCHes only the fields supplied, path slashes preserved", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ orgUnitPath: "/Sales/Support", name: "New Name" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits/Sales/Support");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});

Deno.test("orgunit-update: can move the org unit via parentOrgUnitPath", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ orgUnitPath: "Support", parentOrgUnitPath: "/Engineering" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { parentOrgUnitPath: "/Engineering" });
});
