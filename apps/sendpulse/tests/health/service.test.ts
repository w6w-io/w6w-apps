import { assertEquals } from "@std/assert";
import type { HealthFeedEntry } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function entry(overrides: Partial<HealthFeedEntry> = {}): HealthFeedEntry {
  return {
    title: "Some incident",
    summary: "Type: Incident Duration: 5 minutes Affected Components: REST API Sep 4, 20:13:13 " +
      "GMT+0 Investigating - we are looking into it.",
    summaryHtml: "",
    ...overrides,
  };
}

Deno.test("service: unknown when the feed itself failed", async () => {
  const out = await service.check!(
    { feed: { error: "fetch failed", entries: [], latest: [], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
});

Deno.test("service: ok when there are no entries at all", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: degraded for an open incident affecting a covered component (REST API)", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [entry()], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Some incident");
});

Deno.test("service: reads the LAST status word, not the first — SendPulse's feed is oldest-first", async () => {
  // Statuspage-style logic (first word wins) would misread this as still
  // "Investigating"; SendPulse's own feed writes updates chronologically, so
  // the true current status is the LAST word, "Resolved".
  const resolved = entry({
    summary: "Affected Components: REST API Sep 4, 20:13:13 GMT+0 Investigating - looking into " +
      "it. Sep 5, 06:09:07 GMT+0 Resolved - fixed.",
  });
  const out = await service.check!(
    { feed: { entries: [], latest: [resolved], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: a maintenance entry resolved with the word 'Completed' counts as closed", async () => {
  const completed = entry({
    summary: "Affected Components: CRM Aug 1, 19:00:00 GMT+0 Identified - starting. " +
      "Aug 1, 19:43:00 GMT+0 Completed - done.",
  });
  const out = await service.check!(
    { feed: { entries: [], latest: [completed], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: an incident on an uncovered component (Web Push) is not counted", async () => {
  const other = entry({
    summary: "Affected Components: Web Push Sep 4, 20:13:13 GMT+0 Investigating - looking into it.",
  });
  const out = await service.check!(
    { feed: { entries: [], latest: [other], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: an entry with no parseable Affected Components line is ignored, not counted open", async () => {
  const noComponents = entry({
    summary: "Sep 4, 20:13:13 GMT+0 Investigating - no components line.",
  });
  const out = await service.check!(
    { feed: { entries: [], latest: [noComponents], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});
