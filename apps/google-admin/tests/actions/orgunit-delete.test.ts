import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/orgunit-delete.ts";

Deno.test("orgunit-delete: DELETEs the org unit path with slashes preserved", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ orgUnitPath: "/Sales/Support" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/customer/my_customer/orgunits/Sales/Support");
  assertEquals(result, { orgUnitPath: "/Sales/Support", success: true });
});
