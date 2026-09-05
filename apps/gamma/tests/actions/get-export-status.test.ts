import { assertEquals } from "@std/assert";
import getExportStatus from "../../actions/get-export-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-export-status: calls GET /exports/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        exportId: "exp1",
        exportAs: "pdf",
        status: "completed",
        gammaId: "g_1",
        exportUrl: "https://cdn/x.pdf",
      },
    },
  ]);
  const out = await getExportStatus.execute({ exportId: "exp1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/v1.0/exports/exp1");
  assertEquals(out.status, "completed");
});
