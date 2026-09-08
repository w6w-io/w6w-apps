import { assertEquals } from "@std/assert";
import action from "../../actions/get-custom-report.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-custom-report: fetches by report id and returns rows unshaped", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        metadata: { total_elements: 2, total_pages: 1 },
        data: [{ type: "Report", attributes: { some: "shape" } }],
      },
    },
  ]);
  const out = await action.execute(
    { reportId: "eea50309-d1b1-47d6-bc7e-27de7a3ab491", locale: "de" },
    ctx,
  ) as { items: unknown[]; totalElements: number };

  assertEquals(
    pathOf(calls[0].url),
    "/v1/company/custom-reports/reports/eea50309-d1b1-47d6-bc7e-27de7a3ab491",
  );
  assertEquals(queryOf(calls[0].url).locale, "de");
  assertEquals(out.items.length, 1);
  assertEquals(out.totalElements, 2);
});
