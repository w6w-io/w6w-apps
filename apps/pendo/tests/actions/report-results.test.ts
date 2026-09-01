import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/report-results.ts";

Deno.test("report-results: fetches results.json for the report id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ visitorId: "v1" }] }]);
  const result = await action.execute!({ reportId: "r1" }, ctx) as { results: unknown[] };
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/report/r1/results.json");
  assertEquals(result.results, [{ visitorId: "v1" }]);
});

Deno.test("report-results: `reportId` is required", async () => {
  await assertRejects(
    async () => await action.execute!({}, mockCtx([]).ctx),
    Error,
    "`reportId` is required",
  );
});

Deno.test("report-results: names the unsupported report types in its description", () => {
  const msg = action.description ?? "";
  const paths = /Paths/.test(msg);
  const funnels = /Funnels/.test(msg);
  const retention = /Retention/.test(msg);
  const dataExplorer = /Data Explorer/.test(msg);
  if (!(paths && funnels && retention && dataExplorer)) {
    throw new Error(`description does not name all four unsupported report types: ${msg}`);
  }
});
