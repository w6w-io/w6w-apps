import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import type { HealthFeedEntry, HealthFeedInput } from "@w6w/types";

function entry(summary: string, title = "Incident"): HealthFeedEntry {
  return { title, summary, summaryHtml: summary };
}

function feed(entries: HealthFeedEntry[], error?: string): HealthFeedInput {
  return { entries, latest: entries, fetchedAt: "2026-08-29T00:00:00.000Z", error };
}

Deno.test("service: declares itself a feed-backed check on Kustomer's real status feed", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://status.kustomer.com/history.atom");
});

Deno.test("service: ok when every incident's newest status word is Resolved", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    {
      feed: feed([
        entry("Aug 25, 10:17 EDT Resolved - all clear. Aug 25, 09:51 EDT Monitoring - ..."),
      ]),
    },
    ctx,
  );
  assertEquals(out.state, "ok");
});

Deno.test("service: degraded when an incident's newest status word is not Resolved", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!(
    {
      feed: feed([
        entry(
          "Aug 25, 09:51 EDT Monitoring - rollout in progress",
          "Elevated error rates",
        ),
      ]),
    },
    ctx,
  );
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Elevated error rates");
});

Deno.test("service: unknown when the feed failed to fetch", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!({ feed: feed([], "fetch failed") }, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when no feed is supplied at all", async () => {
  const { ctx } = mockCtx();
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
