import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-mark-no-show.ts";

Deno.test("booking-mark-no-show: POSTs /bookings/{id}/no-show with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "BKNG-1", status: "no_show" } }]);
  await action.execute({ id: "BKNG-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings/BKNG-1/no-show");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
});
