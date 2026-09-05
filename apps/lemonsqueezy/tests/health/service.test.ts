import { assert, assertEquals } from "@std/assert";
import service, { isOpenIncident, STATUS_FEED_URL } from "../../health/service.ts";
import type { HealthFeedInput } from "@w6w/types";

Deno.test("service: declares a feed rather than a raw network probe", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.feed?.url, STATUS_FEED_URL);
  assertEquals(service.network, undefined);
});

Deno.test("isOpenIncident: a resolved/complete/operational title reads as closed", () => {
  assertEquals(isOpenIncident("Resolved - API outage"), false);
  assertEquals(isOpenIncident("This incident has been resolved"), false);
  assertEquals(isOpenIncident("Scheduled maintenance complete"), false);
  assertEquals(isOpenIncident("All systems operational"), false);
});

Deno.test("isOpenIncident: anything else reads as still open", () => {
  assertEquals(isOpenIncident("Investigating API errors"), true);
  assertEquals(isOpenIncident("Degraded performance on checkout"), true);
});

function feed(entries: HealthFeedInput["latest"]): HealthFeedInput {
  return { entries, latest: entries, fetchedAt: new Date().toISOString() };
}

Deno.test("check: no entries at all reports ok", async () => {
  const report = await service.check!({ feed: feed([]) }, {} as never);
  assertEquals(report.state, "ok");
});

Deno.test("check: an open-looking entry reports degraded, naming it", async () => {
  const report = await service.check!(
    { feed: feed([{ title: "Investigating checkout errors", summary: "", summaryHtml: "" }]) },
    {} as never,
  );
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("Investigating checkout errors"));
});

Deno.test("check: a resolved-looking entry reports ok", async () => {
  const report = await service.check!(
    { feed: feed([{ title: "Resolved - checkout errors", summary: "", summaryHtml: "" }]) },
    {} as never,
  );
  assertEquals(report.state, "ok");
});

/** A broken feed says nothing about the vendor — never `down`. */
Deno.test("check: a feed fetch error reports unknown, not down", async () => {
  const report = await service.check!(
    { feed: { entries: [], latest: [], fetchedAt: new Date().toISOString(), error: "timeout" } },
    {} as never,
  );
  assertEquals(report.state, "unknown");
});
