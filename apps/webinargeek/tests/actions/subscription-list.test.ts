import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-list: translates camelCase filters to WebinarGeek's snake_case query", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 1,
        subscriptions: [{ id: 1, email: "john@smith.com" }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await subscriptionList.execute({
    webinarId: 1,
    watchedWebinar: true,
    watchEndFrom: "2024-01-15T00:00:00Z",
    watchEndTo: "2024-01-31T23:59:59Z",
  }, ctx) as { subscriptions: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/subscriptions");
  const q = queryOf(calls[0].url);
  assertEquals(q.webinar_id, "1");
  assertEquals(q.watched_webinar, "true");
  // ISO-8601 strings passed through verbatim — NOT converted to Unix timestamps.
  assertEquals(q.watch_end_from, "2024-01-15T00:00:00Z");
  assertEquals(q.watch_end_to, "2024-01-31T23:59:59Z");
  assertEquals(out.subscriptions, [{ id: 1, email: "john@smith.com" }]);
});
