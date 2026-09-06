import { assertEquals } from "@std/assert";
import action from "../../actions/list-custom-reports.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-custom-reports: maps report metadata fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: [
          {
            type: "Report",
            attributes: {
              id: "eea50309-d1b1-47d6-bc7e-27de7a3ab491",
              name: "Employee vacations past month",
              author_first_name: "Robert",
              author_last_name: "Sirano",
              type: "point_in_time",
              status: "up_to_date",
            },
          },
        ],
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { reports: Array<Record<string, unknown>> };
  assertEquals(pathOf(calls[0].url), "/v1/company/custom-reports/reports");
  assertEquals(out.reports[0].name, "Employee vacations past month");
  assertEquals(out.reports[0].authorFirstName, "Robert");
  assertEquals(out.reports[0].status, "up_to_date");
});

Deno.test("list-custom-reports: forwards status filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: [] } }]);
  await action.execute({ status: "up_to_date" }, ctx);
  assertEquals(queryOf(calls[0].url).status, "up_to_date");
});
