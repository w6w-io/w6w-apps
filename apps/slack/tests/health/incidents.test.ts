import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import incidents from "../../health/incidents.ts";

function entry(
  id: string,
  title: string,
  publishedAt: string,
  link = `https://slack-status.com/${id}`,
) {
  return {
    id,
    title,
    summary: `${title} body`,
    summaryHtml: `<p>${title} body</p>`,
    link,
    publishedAt,
  };
}

const now = Date.now();
const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

// One `Incident:` inside the 7-day window, one `Incident:` ~40 days old, one
// `Notice:` ~20 days old — the DC2 gate: an implementation reusing `recent`
// (the `message`'s 7-day, incidents-only window) returns 1, not 3.
const RECENT_INCIDENT = entry("recent-1", "Incident: API errors", days(1));
const OLD_INCIDENT = entry("old-1", "Incident: Historical outage", days(40));
const OLD_NOTICE = entry("notice-1", "Notice: Scheduled maintenance", days(20));

async function run(latest: ReturnType<typeof entry>[], entries = latest) {
  return await incidents.check!(
    { feed: { entries, latest, fetchedAt: new Date(now).toISOString() } },
    mockCtx().ctx,
  );
}

Deno.test("incidents: message still narrates only the 7-day window (C3, unchanged)", async () => {
  const out = await run([RECENT_INCIDENT, OLD_INCIDENT, OLD_NOTICE]);
  assertEquals(out.state, "ok");
  assertEquals(out.message, "1 incident in the last 7 days: API errors");
});

Deno.test("incidents: timeline is the FULL folded history, not the 7-day window (DC2)", async () => {
  const out = await run([RECENT_INCIDENT, OLD_INCIDENT, OLD_NOTICE]);
  // The DC2 gate: reusing `recent` here would return 1, not 3.
  assertEquals(out.timeline?.length, 3);
});

Deno.test("incidents: an old incident is degraded, a notice is ok, titles are stripped", async () => {
  const out = await run([RECENT_INCIDENT, OLD_INCIDENT, OLD_NOTICE]);
  const byId = new Map((out.timeline ?? []).map((e) => [e.id, e]));

  const old = byId.get("old-1")!;
  assertEquals(old.state, "degraded");
  assertEquals(old.title, "Historical outage");

  const notice = byId.get("notice-1")!;
  assertEquals(notice.state, "ok");
  assertEquals(notice.title, "Scheduled maintenance");

  const recent = byId.get("recent-1")!;
  assertEquals(recent.title, "API errors");
});

Deno.test("incidents: no entry ever sets resolvedAt (C4)", async () => {
  const out = await run([RECENT_INCIDENT, OLD_INCIDENT, OLD_NOTICE]);
  assertEquals((out.timeline ?? []).every((e) => e.resolvedAt === undefined), true);
});

Deno.test("incidents: id equals the fixture entry's own id literal", async () => {
  const out = await run([OLD_INCIDENT]);
  assertEquals(out.timeline?.[0].id, "old-1");
  assertEquals(out.timeline?.[0].link, "https://slack-status.com/old-1");
  assertEquals(out.timeline?.[0].updatedAt, OLD_INCIDENT.publishedAt);
});

Deno.test("incidents: a feed error is unknown and publishes no timeline (C5)", async () => {
  const out = await incidents.check!(
    {
      feed: {
        entries: [],
        latest: [],
        fetchedAt: new Date(now).toISOString(),
        error: "fetch failed",
      },
    },
    mockCtx().ctx,
  );
  assertEquals(out.state, "unknown");
  assertEquals(out.timeline, undefined);
});

Deno.test("incidents: an empty feed is ok and publishes no timeline (C5)", async () => {
  const out = await incidents.check!(
    { feed: { entries: [], latest: [], fetchedAt: new Date(now).toISOString() } },
    mockCtx().ctx,
  );
  assertEquals(out.state, "ok");
  assertEquals(out.timeline, undefined);
});

Deno.test("incidents: severity stays informational", () => {
  assertEquals(incidents.severity, "informational");
});
