import { assertEquals } from "@std/assert";
import action from "../../actions/get-campaign-summary-report.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-campaign-summary-report: GETs the summary report", async () => {
  const body = {
    id: "cmp1",
    sent: 100,
    bounced: { hard: 1, soft: 2 },
    opened: { total: 60, unique: 40 },
    clicked: { total: 20, unique: 15 },
    complained: 0,
    unsubscribed: 3,
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ campaignId: "cmp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/campaigns/cmp1/reports/summary");
  assertEquals(out, body);
});

Deno.test("get-campaign-summary-report: declares the nested counters as objects", () => {
  const output = action.output as Array<{ key: string; type: string }>;
  const byKey = new Map(output.map((o) => [o.key, o.type]));
  // `bounced`, `opened` and `clicked` are objects; the rest are plain numbers.
  assertEquals(byKey.get("bounced"), "object");
  assertEquals(byKey.get("opened"), "object");
  assertEquals(byKey.get("clicked"), "object");
  assertEquals(byKey.get("sent"), "number");
  assertEquals(byKey.get("unsubscribed"), "number");
});
