import { assertEquals, assertRejects } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/availability-list.ts";

Deno.test("availability-list: GETs /availableslots and maps time_zone to timeZone", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: { data: ["10:00", "10:15"], time_zone: "Asia/Calcutta" },
        },
      },
    },
  ]);
  const out = await action.execute(
    { serviceId: "1", staffId: "2", selectedDate: "30-Apr-2030 10:00:00" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/availableslots");
  assertEquals(url.searchParams.get("service_id"), "1");
  assertEquals(url.searchParams.get("staff_id"), "2");
  assertEquals(url.searchParams.get("selected_date"), "30-Apr-2030 10:00:00");
  assertEquals(out, { data: ["10:00", "10:15"], timeZone: "Asia/Calcutta" });
});

Deno.test("availability-list: throws before making a request when none of staffId/groupId/resourceId is set", async () => {
  const { ctx, calls } = mockBookingsCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ serviceId: "1", selectedDate: "30-Apr-2030 10:00:00" }, ctx),
      ),
    Error,
    "staffId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("availability-list: accepts groupId or resourceId in place of staffId", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
  await action.execute(
    { serviceId: "1", resourceId: "9", selectedDate: "30-Apr-2030 10:00:00" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).searchParams.get("resource_id"), "9");
});
