import { assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/team-list.ts";

Deno.test("team-list: GETs the organization's teams and pages with a cursor", async () => {
  const body = listEnvelope("teams", [{ id: 5, name: "Delivery" }], 9);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!(
    { organization_id: 13, page_start_id: 0 },
    ctx,
  ) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/teams");
  assertEquals(queryOf(calls[0].url), { page_start_id: "0" });
  assertEquals(result.pagination, { next_page_start_id: 9 });
});
