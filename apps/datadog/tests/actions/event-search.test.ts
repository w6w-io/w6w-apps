import { assert, assertEquals } from "@std/assert";
import eventSearch from "../../actions/event-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-search: calls GET /api/v2/events with bracketed filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "e1" }], meta: {} } }]);
  const out = await eventSearch.execute(
    { query: "source:jenkins", from: "1700000000000", to: "1700003600000", limit: 25 },
    ctx,
  ) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/events");
  assertEquals(queryOf(calls[0].url), {
    "filter[query]": "source:jenkins",
    "filter[from]": "1700000000000",
    "filter[to]": "1700003600000",
    "page[limit]": "25",
  });
  assertEquals(out.data, [{ id: "e1" }]);
});

Deno.test("event-search: an empty search sends no filters at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await eventSearch.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("event-search: the cursor is passed as page[cursor]", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await eventSearch.execute({ cursor: "abc", sort: "-timestamp" }, ctx);
  assertEquals(queryOf(calls[0].url), { "page[cursor]": "abc", sort: "-timestamp" });
});

/**
 * v2 events take **milliseconds** where the v1 endpoints take seconds. A seconds
 * value here returns nothing rather than erroring, so the hint has to say it.
 */
Deno.test("event-search: the time hints say milliseconds", () => {
  for (const key of ["from", "to"]) {
    const hint = eventSearch.params?.find((p) => p.key === key)?.hint ?? "";
    assert(hint.includes("milliseconds"), `${key}: ${hint}`);
  }
});

Deno.test("event-search: the limit keeps Datadog's own default of 10", () => {
  assertEquals(eventSearch.params?.find((p) => p.key === "limit")?.default, 10);
});
