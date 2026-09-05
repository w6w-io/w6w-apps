import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-decline.ts";

Deno.test("booking-decline: PUTs /admin/bookings/{id}/decline", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, status: "canceled" } }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({ id: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings/42/decline");
  assertEquals(calls[0].method, "PUT");
  assertEquals(result, { id: 42, status: "canceled" });
});
