import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-calendar-list.ts";

Deno.test("booking-calendar-list: GETs /booking-calendars with host + pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  await action.execute({ host: "USR-1", before: "BKC-A", limit: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/booking-calendars");
  assertEquals(url.searchParams.get("host"), "USR-1");
  assertEquals(url.searchParams.get("before"), "BKC-A");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.has("after"), false);
});
