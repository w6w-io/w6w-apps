import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search-analytics-query.ts";

Deno.test("search-analytics-query: POSTs the required date range and drops AUTO/FINAL defaults", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!(
    {
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      type: "WEB",
      aggregationType: "AUTO",
      dataState: "FINAL",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.startDate, "2026-08-01");
  assertEquals(body.endDate, "2026-08-31");
  assertEquals(body.type, "WEB");
  // AUTO and FINAL are the API's own defaults — omitted rather than sent.
  assertEquals("aggregationType" in body, false);
  assertEquals("dataState" in body, false);
});

Deno.test("search-analytics-query: expands comma-separated dimensions into an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rows: [] } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!(
    { startDate: "2026-08-01", endDate: "2026-08-31", dimensions: "date, query" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.dimensions, ["date", "query"]);
});

Deno.test("search-analytics-query: parses dimensionFilterGroups JSON and rejects invalid JSON", async () => {
  const ok = mockCtx([{ status: 200, body: { rows: [] } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!(
    {
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      dimensionFilterGroups:
        '[{"filters":[{"dimension":"QUERY","operator":"CONTAINS","expression":"buy"}]}]',
    },
    ok.ctx,
  );
  const body = JSON.parse(ok.calls[0].body!) as Record<string, unknown>;
  assertEquals(
    body.dimensionFilterGroups,
    [{ filters: [{ dimension: "QUERY", operator: "CONTAINS", expression: "buy" }] }],
  );

  const bad = mockCtx([], { display: { siteUrl: "https://www.example.com/" } });
  await assertRejects(
    async () =>
      await action.execute!(
        {
          startDate: "2026-08-01",
          endDate: "2026-08-31",
          dimensionFilterGroups: "{not json",
        },
        bad.ctx,
      ),
    Error,
    "not valid JSON",
  );
});

Deno.test("search-analytics-query: startDate and endDate are required", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "https://www.example.com/" } });
  await assertRejects(
    async () => await action.execute!({ endDate: "2026-08-31" }, ctx),
    Error,
    "`startDate`",
  );
  await assertRejects(
    async () => await action.execute!({ startDate: "2026-08-01" }, ctx),
    Error,
    "`endDate`",
  );
  assertEquals(calls.length, 0);
});
