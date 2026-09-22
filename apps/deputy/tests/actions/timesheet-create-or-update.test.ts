import { assertEquals } from "@std/assert";
import action from "../../actions/timesheet-create-or-update.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("timesheet-create-or-update: creates (no id) via /supervise/timesheet/update", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 55 } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({
    intEmployeeId: 1,
    intOpunitId: 2,
    intStartTimestamp: 1616360400,
    intEndTimestamp: 1616382000,
  }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/supervise/timesheet/update`);
  assertEquals(JSON.parse(calls[0].body!), {
    intEmployeeId: 1,
    intOpunitId: 2,
    intStartTimestamp: 1616360400,
    intEndTimestamp: 1616382000,
  });
  assertEquals(out, { response: { Id: 55 } });
});

Deno.test("timesheet-create-or-update: updates (with id + comment) in the same call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }], {
    display: { baseUrl: BASE_URL },
  });
  await action.execute({
    intEmployeeId: 1,
    intOpunitId: 2,
    intStartTimestamp: 1616360400,
    intEndTimestamp: 1616382000,
    intTimesheetId: 1,
    strComment: "Updated via API",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.intTimesheetId, 1);
  assertEquals(body.strComment, "Updated via API");
});

Deno.test("timesheet-create-or-update: is not idempotent without a Timesheet ID", () => {
  assertEquals(action.idempotent, false);
});
