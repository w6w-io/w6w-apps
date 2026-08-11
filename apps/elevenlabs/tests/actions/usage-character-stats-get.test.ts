import { assertEquals } from "@std/assert";
import usageCharacterStatsGet from "../../actions/usage-character-stats-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const SERIES = { time: [1738356858000, 1738443258000], usage: { All: [120, 340] } };

Deno.test("usage-character-stats-get: sends the window and returns the series", async () => {
  const { ctx, calls } = mockCtx([{ body: SERIES }]);
  const out = await usageCharacterStatsGet.execute(
    { startUnix: 1738356858000, endUnix: 1738443258000 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/usage/character-stats");
  assertEquals(queryOf(calls[0].url), {
    start_unix: "1738356858000",
    end_unix: "1738443258000",
  });
  assertEquals(out, SERIES);
});

Deno.test("usage-character-stats-get: metric, breakdown and interval reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: SERIES }]);
  await usageCharacterStatsGet.execute({
    startUnix: 1,
    endUnix: 2,
    metric: "tts_characters",
    breakdownType: "voice",
    aggregationInterval: "week",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    start_unix: "1",
    end_unix: "2",
    metric: "tts_characters",
    breakdown_type: "voice",
    aggregation_interval: "week",
  });
});

/** Workspace metrics default to off server-side, so only the opt-in travels. */
Deno.test("usage-character-stats-get: the workspace flag is only sent when turned on", async () => {
  const { ctx, calls } = mockCtx([{ body: SERIES }, { body: SERIES }]);
  await usageCharacterStatsGet.execute({ startUnix: 1, endUnix: 2 }, ctx);
  assertEquals("include_workspace_metrics" in queryOf(calls[0].url), false);
  await usageCharacterStatsGet.execute(
    { startUnix: 1, endUnix: 2, includeWorkspaceMetrics: true },
    ctx,
  );
  assertEquals(queryOf(calls[1].url).include_workspace_metrics, "true");
});

/**
 * The unit trap: these two timestamps are MILLISECONDS, while every other Unix
 * timestamp in this API is in seconds. Passing seconds returns an empty series
 * dated to 1970 rather than an error, so the label has to say so.
 */
Deno.test("usage-character-stats-get: both window params say MILLISECONDS in their label", () => {
  const params = (usageCharacterStatsGet.params ?? []).filter((p) =>
    p.key === "startUnix" || p.key === "endUnix"
  );
  assertEquals(params.length, 2);
  for (const p of params) {
    assertEquals(p.required, true, `${p.key} must be required — the API has no default window`);
    assertEquals(
      /MILLISECONDS/.test(p.label),
      true,
      `${p.key}: the label does not warn about the unit`,
    );
  }
});
