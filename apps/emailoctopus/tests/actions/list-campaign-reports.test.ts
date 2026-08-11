import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-campaign-reports.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-campaign-reports: always sends the required `status` bucket", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "opened", data: [] } }]);
  await action.execute!({ campaignId: "cmp1", status: "opened" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/campaigns/cmp1/reports");
  assertEquals(url.searchParams.get("status"), "opened");
});

Deno.test("list-campaign-reports: declares `status` required — the API 400s without it", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assertEquals(status.required, true);
  const values = (status.options as Array<{ value: string }>).map((o) => o.value);
  // The full documented enum, negatives included — no need to fetch `sent` and subtract.
  assertEquals(values.sort(), [
    "bounced",
    "clicked",
    "complained",
    "not-clicked",
    "not-opened",
    "opened",
    "sent",
    "unsubscribed",
  ]);
});

Deno.test("list-campaign-reports: pages with limit and cursor alongside the bucket", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!(
    { campaignId: "cmp1", status: "not-clicked", limit: 100, startingAfter: "cur" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "not-clicked");
  assertEquals(p.get("limit"), "100");
  assertEquals(p.get("starting_after"), "cur");
  assert(action.type === "search");
});
