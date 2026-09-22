import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/timesheet-update-status.ts";

Deno.test("timesheet-update-status: PUTs the status to /v2/timesheets/{id}", async () => {
  const body = envelope("timesheet", { id: 1, status: "approved" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ timesheet_id: 1, status: "approved" }, ctx) as typeof body;

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/timesheets/1");
  assertEquals(JSON.parse(calls[0].body!), { status: "approved" });
  assertEquals(result.timesheet.status, "approved");
});

Deno.test("timesheet-update-status: a denial reason accompanies a denial", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope("timesheet", { id: 1, status: "denied" }),
  }]);
  await action.execute!({ timesheet_id: 1, status: "denied", denial_reason: "No timesheet" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "denied", denial_reason: "No timesheet" });
});

/** Approving a period resolves what is pending inside it, hence the two flags. */
Deno.test("timesheet-update-status: both confirmations are sent when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("timesheet", { id: 1 }) }]);
  await action.execute!({
    timesheet_id: 1,
    status: "approved",
    confirm_pending_manual_time_request_denial: true,
    acknowledge_pending_time_off_requests: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    status: "approved",
    confirm_pending_manual_time_request_denial: true,
    acknowledge_pending_time_off_requests: true,
  });
  assertEquals(action.idempotent, true);
});
