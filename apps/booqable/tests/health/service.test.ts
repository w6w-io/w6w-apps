import { assert, assertEquals } from "@std/assert";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const entry = (title: string, summary = ""): HealthFeedEntry => ({
  id: title,
  title,
  summary,
  summaryHtml: summary,
  link: "https://status.booqable.com/",
  publishedAt: "2026-09-06T00:00:00.000Z",
});

/** A well-formed `input.feed`, so each test states only what it is varying. */
const feedInput = (partial: Partial<HealthFeedInput>): HealthFeedInput => ({
  entries: [],
  latest: [],
  fetchedAt: "2026-09-06T00:00:00.000Z",
  ...partial,
});

const run = (feed: HealthFeedInput | undefined) => {
  const { ctx } = mockCtx();
  return service.check!({ feed }, ctx);
};

Deno.test("service: is a feed-backed, unsigned, app-scoped check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.feed?.url, "https://status.booqable.com/history.atom");

  // The spec REQUIRES an unsigned posture for a feed-backed check.
  assert(service.credential === undefined || service.credential === "none");

  // The feed host is allowlisted implicitly, so restating it would be wrong.
  assertEquals(service.network, undefined);

  // A declared feed and a declared absence are mutually exclusive.
  assertEquals(service.unavailable, undefined);
});

Deno.test("service: no open incidents is ok", async () => {
  assertEquals((await run(feedInput({}))).state, "ok");
});

Deno.test("service: an open incident is degraded and names itself", async () => {
  const r = await run(
    feedInput({ latest: [entry("Elevated API error rates", "Investigating")] }),
  );
  assertEquals(r.state, "degraded");
  assert(r.message?.includes("Elevated API error rates"));
});

Deno.test("service: a completed maintenance does not report an outage that ended", async () => {
  // Booqable's Statuspage instance concatenates every update for an incident
  // into ONE entry's content, newest update first — "Completed" appearing
  // anywhere in that concatenated text means the newest update said so.
  const r = await run(
    feedInput({
      latest: [
        entry(
          "Database maintenance",
          "Completed - The scheduled maintenance has been completed. Verifying - Verification is " +
            "currently underway. In progress - Scheduled maintenance is currently in progress.",
        ),
      ],
    }),
  );
  assertEquals(r.state, "ok");
});

Deno.test("service: a mixed feed reports only what is still open", async () => {
  const r = await run(feedInput({
    latest: [
      entry("Old maintenance", "Completed - all clear"),
      entry("Live outage", "Investigating - ongoing"),
    ],
  }));
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "Live outage");
});

Deno.test("service: an unreadable feed is unknown, never down", async () => {
  assertEquals((await run(feedInput({ error: "502" }))).state, "unknown");
  assertEquals((await run(undefined)).state, "unknown");
});

Deno.test("service: the check makes no network call of its own", async () => {
  const { ctx, calls } = mockCtx();
  await service.check!({ feed: feedInput({}) }, ctx);
  assertEquals(calls.length, 0);
});
