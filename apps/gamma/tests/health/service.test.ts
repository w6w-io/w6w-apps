import { assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service, {
  affectedComponents,
  isResolved,
  latestStatusToken,
} from "../../health/service.ts";

const resolvedEntry: HealthFeedEntry = {
  id: "incident-1",
  title: "Issues loading Gamma",
  summary:
    "Type: Incident\nDuration: 53 minutes\n\nAffected Components: Web Application, Multiplayer, AI, API\n" +
    "Aug 3, 21:12:20 GMT+0 - Investigating - We are currently investigating this incident. " +
    "Aug 3, 21:15:43 GMT+0 - Identified - We have identified a root cause. " +
    "Aug 3, 22:05:31 GMT+0 - Resolved - This incident has been resolved.",
  summaryHtml: "",
  publishedAt: "2026-08-03T21:12:20Z",
};

const openEntry: HealthFeedEntry = {
  id: "incident-2",
  title: "API degraded",
  summary: "Type: Incident\n\nAffected Components: API\n" +
    "Sep 5, 10:00:00 GMT+0 - Investigating - We are looking into elevated error rates.",
  summaryHtml: "",
  publishedAt: "2026-09-05T10:00:00Z",
};

const unrecognizedEntry: HealthFeedEntry = {
  id: "incident-3",
  title: "Something happened",
  summary: "No structured status line here at all.",
  summaryHtml: "",
};

function feed(
  entries: HealthFeedEntry[],
  overrides: Partial<HealthFeedInput> = {},
): HealthFeedInput {
  return { entries, latest: entries, fetchedAt: "2026-09-05T12:00:00Z", ...overrides };
}

Deno.test("latestStatusToken: reads the LAST status line, not the first", () => {
  assertEquals(latestStatusToken(resolvedEntry), "Resolved");
  assertEquals(latestStatusToken(openEntry), "Investigating");
});

Deno.test("latestStatusToken: undefined when no recognised token is present — never guessed", () => {
  assertEquals(latestStatusToken(unrecognizedEntry), undefined);
});

Deno.test("isResolved: true only when the terminal token is Resolved", () => {
  assertEquals(isResolved(resolvedEntry), true);
  assertEquals(isResolved(openEntry), false);
  assertEquals(isResolved(unrecognizedEntry), false);
});

Deno.test("affectedComponents: parses the Affected Components line", () => {
  assertEquals(affectedComponents(resolvedEntry), ["Web Application", "Multiplayer", "AI", "API"]);
  assertEquals(affectedComponents(openEntry), ["API"]);
  assertEquals(affectedComponents(unrecognizedEntry), []);
});

Deno.test("service: ok when the feed has no incidents at all", async () => {
  const report = await service.check!({ feed: feed([]) }, {} as never);
  assertEquals(report.state, "ok");
});

Deno.test("service: ok when every incident's latest entry is resolved", async () => {
  const report = await service.check!({ feed: feed([resolvedEntry]) }, {} as never);
  assertEquals(report.state, "ok");
});

Deno.test("service: degraded when an incident's latest entry is still open, with components named", async () => {
  const report = await service.check!({ feed: feed([resolvedEntry, openEntry]) }, {} as never);
  assertEquals(report.state, "degraded");
  if (!report.message?.includes("API degraded")) {
    throw new Error(`expected the open incident's title in the message, got: ${report.message}`);
  }
  if (!report.message?.includes("API")) {
    throw new Error(`expected the affected component in the message, got: ${report.message}`);
  }
});

Deno.test("service: unknown when the feed itself failed, never down", async () => {
  const report = await service.check!(
    { feed: feed([], { error: "status.gamma.app timed out" }) },
    {} as never,
  );
  assertEquals(report.state, "unknown");
  assertEquals(report.message, "status.gamma.app timed out");
});

Deno.test("service: is unsigned and app-scoped, so it can widen egress via feed", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.scope, "app");
  assertEquals(service.feed?.format, "atom");
});

/**
 * `unavailable: informational` is the trap this file avoids by declaring a
 * real feed — but if that ever regresses to `unavailable`, it must still be
 * informational or the App pins at `unknown` forever.
 */
Deno.test("service: declares a check, not an unavailable stub", () => {
  assertEquals(typeof service.check, "function");
  assertEquals(service.unavailable, undefined);
});
