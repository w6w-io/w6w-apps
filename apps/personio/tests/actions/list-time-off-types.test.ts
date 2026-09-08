import { assertEquals } from "@std/assert";
import action from "../../actions/list-time-off-types.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-time-off-types: maps id/name/category/unit/approvalRequired", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: [
          {
            type: "TimeOffType",
            attributes: {
              id: 1234,
              name: "Paid vacation",
              category: "paid_vacation",
              unit: "day",
              approval_required: true,
            },
          },
        ],
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { timeOffTypes: Array<Record<string, unknown>> };
  assertEquals(pathOf(calls[0].url), "/v1/company/time-off-types");
  assertEquals(out.timeOffTypes[0], {
    id: 1234,
    name: "Paid vacation",
    category: "paid_vacation",
    unit: "day",
    approvalRequired: true,
  });
});
