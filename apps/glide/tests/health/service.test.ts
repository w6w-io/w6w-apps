import { assert, assertEquals } from "@std/assert";
import service, { currentStatusWord, severityFromTitle } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function entry(id: string, title: string, summary: string) {
  return { id, title, summary, summaryHtml: summary, publishedAt: "2026-01-01T00:00:00Z" };
}

// The exact incident text observed live on 2026-09-06, HTML-stripped as the
// host's feed parser would deliver it.
const RESOLVED_INCIDENT_TEXT =
  "Major incident - Apps, General, Data, Glide Tables, Builder, General " +
  "September  1, 2026 · 15:56 UTC Resolved " +
  "The data provider incident has resolved and all Glide systems are operational. " +
  "September  1, 2026 · 15:20 UTC Issue " +
  "We are seeing an increased level of errors and latency with our primary data provider " +
  "powering Glide apps and Glide tables.";

const OPEN_INCIDENT_TEXT = "Major incident - Apps, General, Data, Glide Tables, Builder, General " +
  "September  1, 2026 · 15:20 UTC Issue " +
  "We are seeing an increased level of errors and latency with our primary data provider " +
  "powering Glide apps and Glide tables.";

Deno.test("currentStatusWord: reads the newest (first) status word — Resolved, in the real incident text", () => {
  assertEquals(currentStatusWord(RESOLVED_INCIDENT_TEXT), "resolved");
});

Deno.test("currentStatusWord: an incident with no Resolved update yet reads as Issue", () => {
  assertEquals(currentStatusWord(OPEN_INCIDENT_TEXT), "issue");
});

Deno.test("currentStatusWord: unrecognised text returns undefined", () => {
  assertEquals(currentStatusWord("Scheduled maintenance window next week."), undefined);
});

Deno.test("severityFromTitle: Major incident maps to down, Minor to degraded", () => {
  assertEquals(severityFromTitle("Major incident - Apps"), "down");
  assertEquals(severityFromTitle("Minor incident - Website"), "degraded");
  assertEquals(severityFromTitle("no leading severity word"), "degraded");
});

Deno.test("service: ok when the only incident's latest entry is Resolved", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("395692", "Glide Classic increased error rate", RESOLVED_INCIDENT_TEXT)],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: down when a Major incident is still open", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [entry("395692", "Glide Classic increased error rate", OPEN_INCIDENT_TEXT)],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "down");
  assert(out.message?.includes("Glide Classic increased error rate"));
});

Deno.test("service: unknown when the feed failed to fetch", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "now", error: "fetch failed" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
});

Deno.test("service: ok with no feed input at all (defensive default)", async () => {
  const out = await service.check!({}, mockCtx().ctx);
  assertEquals(out.state, "ok");
});

Deno.test("service: ok with no open incidents at all (empty latest)", async () => {
  const out = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: "now" } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: an unrecognised status word reports unknown rather than a guessed verdict", async () => {
  const out = await service.check!(
    {
      feed: {
        entries: [],
        latest: [
          entry("1", "Something odd", "Minor incident - X\nSome new status we've never seen"),
        ],
        fetchedAt: "now",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
});
