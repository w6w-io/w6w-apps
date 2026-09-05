import { assertEquals } from "@std/assert";
import createEvent from "../../actions/create-event.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-event: POSTs /v1/events with required start/end dates", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: item("1", "event", { name: "New Appointment" }),
  }]);
  const out = await createEvent.execute({
    name: "New Appointment",
    startDate: "2026-09-30T15:00:00-07:00",
    endDate: "2026-09-30T15:30:00-07:00",
  }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/events");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.start_date, "2026-09-30T15:00:00-07:00");
  assertEquals(body.end_date, "2026-09-30T15:30:00-07:00");
  assertEquals(out.id, "1");
});

Deno.test("create-event: forwards reminder/association/host fields when set", async () => {
  const { ctx, calls } = mockCtx([{ body: item("2", "event", {}) }]);
  await createEvent.execute({
    name: "Consultation",
    startDate: "2026-09-30T15:00:00-07:00",
    endDate: "2026-09-30T15:30:00-07:00",
    eventableType: "Prospect",
    eventableId: "74",
    userIds: "5,6",
    reminderType: "minutes",
    reminderDelayLength: 10,
    allDay: false,
    sendInvites: true,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.eventable_type, "Prospect");
  assertEquals(body.eventable_id, "74");
  assertEquals(body.user_ids, ["5", "6"]);
  assertEquals(body.reminder_type, "minutes");
  assertEquals(body.reminder_delay_length, 10);
  assertEquals(body.all_day, false);
  assertEquals(body.send_invites, true);
});

Deno.test("create-event: eventable type options never include Company", () => {
  const options = createEvent.params?.find((p) => p.key === "eventableType")?.options;
  const values = (options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.includes("Company"), false);
});

Deno.test("create-event: is marked non-idempotent", () => {
  assertEquals(createEvent.idempotent, false);
});
