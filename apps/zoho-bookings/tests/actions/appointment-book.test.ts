import { assertEquals, assertRejects } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/appointment-book.ts";

Deno.test("appointment-book: POSTs form-data with a JSON-encoded customer_details field", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: { booking_id: "#AN-00014", status: "upcoming" },
        },
      },
    },
  ]);
  const out = await action.execute(
    {
      serviceId: "1",
      staffId: "2",
      fromTime: "28-Jan-2030 11:00:00",
      customerName: "John",
      customerEmail: "john@zylker.com",
      customerPhone: "9876543201",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/appointment");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].form?.service_id, "1");
  assertEquals(calls[0].form?.staff_id, "2");
  assertEquals(calls[0].form?.from_time, "28-Jan-2030 11:00:00");
  assertEquals(
    JSON.parse(calls[0].form!.customer_details),
    { name: "John", email: "john@zylker.com", phone_number: "9876543201" },
  );
  assertEquals(out, { booking_id: "#AN-00014", status: "upcoming" });
});

Deno.test("appointment-book: builds payment_info from costPaid only when provided", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: {} } } },
  ]);
  await action.execute(
    {
      serviceId: "1",
      groupId: "3",
      fromTime: "28-Jan-2030 11:00:00",
      customerName: "John",
      customerEmail: "john@zylker.com",
      costPaid: "100.00",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].form!.payment_info), { cost_paid: "100.00" });
});

Deno.test("appointment-book: throws before requesting when none of staffId/resourceId/groupId is set", async () => {
  const { ctx, calls } = mockBookingsCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(action.execute(
        {
          serviceId: "1",
          fromTime: "28-Jan-2030 11:00:00",
          customerName: "John",
          customerEmail: "john@zylker.com",
        },
        ctx,
      )),
    Error,
    "staffId",
  );
  assertEquals(calls.length, 0);
});
