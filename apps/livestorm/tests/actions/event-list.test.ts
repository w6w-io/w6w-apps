import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import type { JsonApiListResponse } from "../../lib/client.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("event-list: paginates and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("events", "e1", { title: "Demo" })]) }]);
  const result = await eventList.execute({
    pageNumber: 1,
    pageSize: 25,
    schedulingStatus: "live",
    tag: "launch",
    include: "sessions",
  }, ctx) as JsonApiListResponse;

  assertEquals(pathOf(calls[0].url), "/v1/events");
  assertEquals(queryOf(calls[0].url), {
    "page[number]": "1",
    "page[size]": "25",
    "filter[scheduling_status]": "live",
    "filter[tag]": "launch",
    "include": "sessions",
  });
  assertEquals(result.data.length, 1);
  assertEquals(result.meta?.record_count, 1);
});

Deno.test("event-list: no filters sends a bare request", async () => {
  const { ctx, calls } = mockCtx([{ body: list([]) }]);
  await eventList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
