import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-association.ts";

Deno.test("create-association: PUTs the v4 default-label association endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      fromObjectType: "contacts",
      fromObjectId: "c1",
      toObjectType: "companies",
      toObjectId: "co1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/crm/v4/objects/contacts/c1/associations/default/companies/co1",
  );
});
