import { assert, assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary = ""): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.gorgias.com/",
  publishedAt: "2026-08-29T00:00:00.000Z",
});

/** A well-formed `input.feed`, so each test states only what it is varying. */
const feedInput = (partial: Partial<HealthFeedInput>): HealthFeedInput => ({
  entries: [],
  latest: [],
  fetchedAt: "2026-08-29T00:00:00.000Z",
  ...partial,
});

const run = (feed: HealthFeedInput | undefined) => {
  const { ctx } = mockCtx();
  return service.check!({ feed }, ctx);
};

Deno.test("service: is a feed-backed, unsigned, app-scoped check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.feed?.url, "https://status.gorgias.com/history.atom");

  // The spec REQUIRES an unsigned posture for a feed-backed check: "A check
  // declaring `feed` MUST have `credential` of `none` or `context` — never
  // `signed`." `none` is this kind's default.
  assert(service.credential === undefined || service.credential === "none");

  // The feed host is allowlisted implicitly, so restating it would be wrong —
  // and status.gorgias.com must never reach the app's own egress allowlist.
  assertEquals(service.network, undefined);

  // A declared feed and a declared absence are mutually exclusive.
  assertEquals(service.unavailable, undefined);
});

Deno.test("service: no open incidents is ok", async () => {
  assertEquals((await run(feedInput({}))).state, "ok");
});

Deno.test("service: an open incident is degraded and names itself", async () => {
  const r = await run(
    feedInput({ latest: [entry("Delayed email sync for Gmail integrations", "Investigating")] }),
  );
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Delayed email sync for Gmail integrations"));
});

Deno.test("service: a resolved incident does not report an outage that ended", async () => {
  // Gorgias's Statuspage instance concatenates every update for an incident
  // into ONE entry's summary, newest update first — "Resolved" appearing
  // anywhere in that concatenated text means the newest update said so.
  const r = await run(
    feedInput({
      latest: [
        entry(
          "Ticket, order and product search showing outdated results",
          "Resolved - This incident has been resolved. Monitoring - A fix has been implemented. Investigating - We are looking into this.",
        ),
      ],
    }),
  );
  assertEquals(r.state, "ok");
});

Deno.test("service: a mixed feed reports only what is still open", async () => {
  const r = await run(feedInput({
    latest: [
      entry("Old outage", "Resolved - all clear"),
      entry("Live outage", "Investigating - ongoing"),
    ],
  }));
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Live outage");
});

Deno.test("service: an unreadable feed is unknown, never down", async () => {
  // A status feed that itself fails tells us nothing about the vendor.
  assertEquals((await run(feedInput({ error: "502" }))).state, "unknown");
  assertEquals((await run(undefined)).state, "unknown");
});

Deno.test("service: the check makes no network call of its own", async () => {
  // The host fetches and parses the feed; this app never reimplements a reader.
  const { ctx, calls } = mockCtx();
  await service.check!({ feed: feedInput({}) }, ctx);
  assertEquals(calls.length, 0);
});
