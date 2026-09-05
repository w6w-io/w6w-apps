import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-cancel.ts";

Deno.test("booking-cancel: DELETEs /admin/bookings/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, status: "canceled" } }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({ id: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { id: 42, status: "canceled" });
});
