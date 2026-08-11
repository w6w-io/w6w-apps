import { assertEquals } from "@std/assert";
import campaignSequenceList from "../../actions/campaign-sequence-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-sequence-list: reads the campaign's sequences", async () => {
  const { ctx, calls } = mockCtx([{
    body: { sequences: [{ id: "5", name: "Welcome Series" }], campaign_id: "1" },
  }]);
  const out = await campaignSequenceList.execute({ campaignId: "1" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/campaigns/1/sequences");
  assertEquals(out.count, 1);
});

/**
 * The response carries `next_page_token` and the operation declares exactly one
 * parameter — `campaign_id`. There is no cursor to feed it back into, so the
 * token can only be reported, and no page parameter may be invented.
 */
Deno.test("campaign-sequence-list: sends no page parameters, because none exist", async () => {
  const { ctx, calls } = mockCtx([{ body: { sequences: [] } }]);
  await campaignSequenceList.execute({ campaignId: "1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("campaign-sequence-list: a cursor in the response is surfaced as truncation", async () => {
  const { ctx } = mockCtx([{ body: { sequences: [{ id: "5" }], next_page_token: "more" } }]);
  const out = await campaignSequenceList.execute({ campaignId: "1" }, ctx) as {
    truncated: boolean;
  };
  assertEquals(out.truncated, true);
});

Deno.test("campaign-sequence-list: no cursor means nothing was truncated", async () => {
  const { ctx } = mockCtx([{ body: { sequences: [{ id: "5" }] } }]);
  const out = await campaignSequenceList.execute({ campaignId: "1" }, ctx) as {
    truncated: boolean;
  };
  assertEquals(out.truncated, false);
});

/** "Retrieves a list of Sequences (published) for a Campaign." */
Deno.test("campaign-sequence-list: the hint warns that unpublished campaigns list nothing", () => {
  const hint = campaignSequenceList.params?.find((p) => p.key === "campaignId")?.hint ?? "";
  assertEquals(/published/.test(hint), true);
});
