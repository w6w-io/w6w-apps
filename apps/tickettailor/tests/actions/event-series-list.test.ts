import { assertEquals } from "@std/assert";
import eventSeriesList from "../../actions/event-series-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("event-series-list: hits GET /event_series with compacted query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "es_1" }]) }]);
  const result = await eventSeriesList.execute(
    { status: ["draft", "published"], name: "Tulip", limit: 10 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/event_series");
  assertEquals(queryOf(calls[0].url), { status: "draft,published", name: "Tulip", limit: "10" });
  assertEquals((result as { data: unknown[] }).data.length, 1);
});

Deno.test("event-series-list: omits filters that were left unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await eventSeriesList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
