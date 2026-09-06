import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-time-off.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-time-off: fetches by id and flattens the response", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: {
          type: "TimeOffPeriod",
          attributes: { id: 12345, status: "approved", start_date: "2017-12-27" },
        },
      },
    },
  ]);
  const out = await action.execute({ id: 12345 }, ctx) as {
    timeOff: { id: number; status: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/company/time-offs/12345");
  assertEquals(out.timeOff.id, 12345);
  assertEquals(out.timeOff.status, "approved");
});

Deno.test("get-time-off: surfaces a 404 not-found message", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: { success: false, error: { code: 404, message: "The absence period was not found." } },
    },
  ]);
  await assertRejects(
    async () => await action.execute({ id: 999 }, ctx),
    Error,
    "The absence period was not found.",
  );
});
