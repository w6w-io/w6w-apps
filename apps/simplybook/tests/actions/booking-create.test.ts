import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-create.ts";

Deno.test("booking-create: POSTs /admin/bookings with the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { bookings: [{ id: 1 }] } }], { display: TEST_DISPLAY });
  await action.execute({
    startDatetime: "2026-09-05 11:15:00",
    serviceId: 7,
    providerId: 3,
    clientId: 12,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start_datetime, "2026-09-05 11:15:00");
  assertEquals(body.service_id, 7);
  assertEquals(body.provider_id, 3);
  assertEquals(body.client_id, 12);
});

Deno.test("booking-create: includes optional fields when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { bookings: [] } }], { display: TEST_DISPLAY });
  await action.execute({
    startDatetime: "2026-09-05 11:15:00",
    serviceId: 7,
    providerId: 3,
    clientId: 12,
    locationId: 2,
    count: 3,
    isSequential: true,
    additionalFields: [{ id: 5, value: "note" }],
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location_id, 2);
  assertEquals(body.count, 3);
  assertEquals(body.is_sequential, true);
  assertEquals(body.additional_fields, [{ id: 5, value: "note" }]);
});
