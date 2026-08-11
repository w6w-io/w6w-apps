import { assert, assertEquals } from "@std/assert";
import dashboardList from "../../actions/dashboard-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("dashboard-list: calls GET /api/v1/dashboard", async () => {
  const { ctx, calls } = mockCtx([{ body: { dashboards: [{ id: "abc-def-ghi" }] } }]);
  const out = await dashboardList.execute({ count: 100 }, ctx) as { dashboards: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v1/dashboard");
  assertEquals(queryOf(calls[0].url), { count: "100" });
  assertEquals(out.dashboards.length, 1);
});

/**
 * Datadog documents `filter[shared]` and `filter[deleted]` as incompatible, so
 * they are one select here — a user cannot set both.
 */
Deno.test("dashboard-list: the two incompatible filters are mutually exclusive by construction", async () => {
  const shared = mockCtx([{ body: {} }]);
  await dashboardList.execute({ filter: "shared" }, shared.ctx);
  assertEquals(queryOf(shared.calls[0].url), { "filter[shared]": "true" });

  const deleted = mockCtx([{ body: {} }]);
  await dashboardList.execute({ filter: "deleted" }, deleted.ctx);
  assertEquals(queryOf(deleted.calls[0].url), { "filter[deleted]": "true" });

  const neither = mockCtx([{ body: {} }]);
  await dashboardList.execute({ filter: "" }, neither.ctx);
  assertEquals(queryOf(neither.calls[0].url), {});

  const options = dashboardList.params?.find((p) => p.key === "filter")?.options;
  assertEquals(Array.isArray(options) ? options.length : 0, 3);
});

/** It returns custom and cloned dashboards only — never Datadog's presets. */
Deno.test("dashboard-list: the description states that presets are excluded", () => {
  assert(dashboardList.description?.includes("Preset dashboards are not returned"));
});
