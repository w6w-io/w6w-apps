import { assertEquals } from "@std/assert";
import opportunityStageList from "../../actions/opportunity-stage-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { stages: [{ id: "1", name: "Qualified" }], next_page_token: "" };

Deno.test("opportunity-stage-list: reads the stages path and unwraps the `stages` key", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await opportunityStageList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/opportunities/stages");
  assertEquals(out.count, 1);
});

/** `stage_order` is the only sort field this endpoint accepts. */
Deno.test("opportunity-stage-list: sorts by stage_order, ascending by default", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }, { body: PAGE }]);
  await opportunityStageList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).order_by, "stage_order asc");
  await opportunityStageList.execute({ direction: "desc" }, ctx);
  assertEquals(queryOf(calls[1].url).order_by, "stage_order desc");
});

Deno.test("opportunity-stage-list: the name filter uses the endpoint's own clause name", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await opportunityStageList.execute({ name: "Qual*" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "opportunity_stage_name==Qual*");
});
