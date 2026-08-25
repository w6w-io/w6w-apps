import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-get.ts";

Deno.test("booking-get: GETs /bookings/{id} with optional expand", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1" } }]);
  await action.execute({ id: "BKNG-1", expand: "owner" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG-1");
  assertEquals(url.searchParams.get("expand"), "owner");
});

Deno.test("booking-get: encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ id: "BKNG/weird" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG%2Fweird");
});
