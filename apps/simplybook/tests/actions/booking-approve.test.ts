import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-approve.ts";

Deno.test("booking-approve: PUTs /admin/bookings/{id}/approve", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, status: "confirmed" } }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({ id: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings/42/approve");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result, { id: 42, status: "confirmed" });
});
