import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-get.ts";

Deno.test("booking-get: GETs /admin/bookings/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42 } }], { display: TEST_DISPLAY });
  const result = await action.execute({ id: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: 42 });
});

Deno.test("booking-get: encodes the id into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: TEST_DISPLAY });
  await action.execute({ id: "abc/def" }, ctx);
  assertEquals(pathOf(calls[0].url), "/admin/bookings/abc%2Fdef");
});
