import { assertEquals } from "@std/assert";
import timeEntryList from "../../actions/time-entry-list.ts";
import { hostOf, mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("time-entry-list: calls GET /v1/TimeEntries on the time-tracking host", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "t1", type: "In" }], 1) }]);
  const out = await timeEntryList.execute({}, ctx) as { items: unknown[]; count?: number };
  assertEquals(hostOf(calls[0].url), "https://time-tracking.prod.jibble.io");
  assertEquals(pathOf(calls[0].url), "/v1/TimeEntries");
  assertEquals(out.items, [{ id: "t1", type: "In" }]);
  assertEquals(out.count, 1);
});
