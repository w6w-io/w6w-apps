import { assertEquals } from "@std/assert";
import emailReportingOverviewGet from "../../actions/email-reporting-overview-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-reporting-overview-get: POSTs {filters} — filters is always present, even empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacted: 10, delivered: 9, replied: 2 } }]);
  const out = await emailReportingOverviewGet.execute({}, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/reporting/emails/overview");
  assertEquals(JSON.parse(calls[0].body!), { filters: {} });
  assertEquals(out as unknown, { contacted: 10, delivered: 9, replied: 2 });
});

Deno.test("email-reporting-overview-get: a date range preset and sequence scoping are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await emailReportingOverviewGet.execute(
    { dateRangePreset: "lastWeek", sequenceIds: "[1,2]" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    filters: { dateRangePreset: "lastWeek", sequenceIds: [1, 2] },
  });
});
