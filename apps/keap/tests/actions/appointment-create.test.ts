import { assertEquals, assertRejects } from "@std/assert";
import appointmentCreate from "../../actions/appointment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const CREATED = { id: "1", title: "Demo" };

Deno.test("appointment-create: POSTs to the v1 path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await appointmentCreate.execute(
    {
      title: "Demo",
      startDate: "2026-01-15T09:00:00.000Z",
      endDate: "2026-01-15T10:00:00.000Z",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v1/appointments");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Demo",
    start_date: "2026-01-15T09:00:00.000Z",
    end_date: "2026-01-15T10:00:00.000Z",
  });
});

/** Only title, start and end are required — a contact-less calendar block is legal. */
Deno.test("appointment-create: title, start and end are the required params", () => {
  const required = (appointmentCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["endDate", "startDate", "title"]);
});

/**
 * The assignee's property on the v1 schema is bare `user`, holding an int64 —
 * where every v2 equivalent is `user_id` or `assigned_to_user_id`.
 */
Deno.test("appointment-create: the assignee is `user`, as a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await appointmentCreate.execute(
    {
      title: "Demo",
      startDate: "2026-01-15T09:00:00.000Z",
      endDate: "2026-01-15T10:00:00.000Z",
      userId: "7",
      contactId: "9",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user, 7);
  assertEquals(body.user_id, undefined);
  assertEquals(body.contact_id, 9);
  assertEquals(typeof body.contact_id, "number");
});

/**
 * Keap: `user` is "Required only for pop-up reminders", `contact_id` is
 * "Required for pop-up reminders". Without both, the reminder quietly does not
 * happen.
 */
Deno.test("appointment-create: a reminder without a contact and a user is refused up front", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await appointmentCreate.execute(
        {
          title: "Demo",
          startDate: "2026-01-15T09:00:00.000Z",
          endDate: "2026-01-15T10:00:00.000Z",
          remindTime: 30,
        },
        ctx,
      ),
    Error,
    "needs both a contact ID and an assigned user ID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("appointment-create: a reminder with both goes out as a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: CREATED }]);
  await appointmentCreate.execute(
    {
      title: "Demo",
      startDate: "2026-01-15T09:00:00.000Z",
      endDate: "2026-01-15T10:00:00.000Z",
      contactId: "9",
      userId: "7",
      remindTime: 30,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.remind_time, 30);
  assertEquals(typeof body.remind_time, "number");
});

Deno.test("appointment-create: is declared non-idempotent — a retry double-books", () => {
  assertEquals(appointmentCreate.idempotent, false);
});
