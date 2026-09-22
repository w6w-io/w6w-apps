import { assertEquals } from "@std/assert";
import action from "../../actions/timesheet-get.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("timesheet-get: GETs /resource/Timesheet/{id}", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 7, TotalTime: 8.5 } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ id: 7 }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Timesheet/7`);
  assertEquals(out, { Id: 7, TotalTime: 8.5 });
});
