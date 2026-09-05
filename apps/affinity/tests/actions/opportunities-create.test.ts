import { assertEquals } from "@std/assert";
import opportunitiesCreate from "../../actions/opportunities-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("opportunities-create: POSTs name/list_id/person_ids/organization_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 120611418, name: "Penny Opportunity" } }]);
  await opportunitiesCreate.execute(
    { name: "Penny Opportunity", listId: 6645, personIds: "38706", organizationIds: "21442" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/opportunities");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Penny Opportunity",
    list_id: 6645,
    person_ids: [38706],
    organization_ids: [21442],
  });
});
