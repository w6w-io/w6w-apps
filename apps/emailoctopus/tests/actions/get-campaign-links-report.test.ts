import { assert, assertEquals } from "@std/assert";
import action from "../../actions/get-campaign-links-report.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-campaign-links-report: GETs the links report", async () => {
  const body = { data: [{ url: "https://example.com", clicked_total: 9, clicked_unique: 4 }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ campaignId: "cmp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/campaigns/cmp1/reports/links");
  assertEquals(out, body);
});

Deno.test("get-campaign-links-report: takes no paging params — this report is not paginated", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys, ["campaignId"]);
  assert(!keys.includes("limit"));
  assert(!keys.includes("startingAfter"));
});
