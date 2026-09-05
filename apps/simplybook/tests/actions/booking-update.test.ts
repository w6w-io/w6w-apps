import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-update.ts";

Deno.test("booking-update: PUTs /admin/bookings/{id} with the core fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { bookings: [{ id: 42 }] } }], {
    display: TEST_DISPLAY,
  });
  await action.execute({
    id: "42",
    startDatetime: "2026-09-05 11:15:00",
    serviceId: 7,
    providerId: 3,
    clientId: 12,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings/42");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start_datetime, "2026-09-05 11:15:00");
  assertEquals(body.service_id, 7);
  assertEquals(body.provider_id, 3);
  assertEquals(body.client_id, 12);
});
