import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-association.ts";

Deno.test("delete-association: DELETEs the v4 association", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!(
    {
      fromObjectType: "contacts",
      fromObjectId: "c1",
      toObjectType: "companies",
      toObjectId: "co1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/crm/v4/objects/contacts/c1/associations/companies/co1",
  );
  assertEquals((out as { deleted: boolean }).deleted, true);
});
