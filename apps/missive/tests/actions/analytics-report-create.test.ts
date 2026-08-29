import { assertEquals } from "@std/assert";
import action from "../../actions/analytics-report-create.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("analytics-report-create: posts the report request and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { reports: { id: "rep-1" } } }]);
  const out = await action.execute(
    { organization: "org-1", start: 1691812800, end: 1692371867, timeZone: "America/Montreal" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/analytics/reports");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reports.organization, "org-1");
  assertEquals(body.reports.time_zone, "America/Montreal");
  assertEquals(out, { id: "rep-1" });
});

Deno.test("analytics-report-create: passes array filters through", async () => {
  const { ctx, calls } = mockCtx([{ body: { reports: { id: "rep-2" } } }]);
  await action.execute(
    {
      organization: "org-1",
      start: 1,
      end: 2,
      teams: "t1, t2",
      accountTypes: "email,sms",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reports.teams, ["t1", "t2"]);
  assertEquals(body.reports.account_types, ["email", "sms"]);
});

Deno.test("analytics-report-create: requires organization/start/end", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ organization: "", start: 0, end: 0 }, ctx));
});
