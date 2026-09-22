import { assertEquals } from "@std/assert";
import action from "../../actions/timesheet-list.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("timesheet-list: GETs /resource/Timesheet and reports count", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: [{ Id: 1 }, { Id: 2 }] }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/resource/Timesheet`);
  assertEquals(out, { items: [{ Id: 1 }, { Id: 2 }], count: 2 });
});
