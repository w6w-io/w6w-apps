import { assertEquals } from "@std/assert";
import responseExportStatus from "../../actions/response-export-status.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("response-export-status: polls the export job and returns fileId when complete", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ percentComplete: 100, status: "complete", fileId: "EF_1" }) },
  ]);
  const out = await responseExportStatus.execute(
    { surveyId: "SV_1", progressId: "ES_1" },
    ctx,
  ) as { status: string; fileId?: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV_1/export-responses/ES_1`);
  assertEquals(out.status, "complete");
  assertEquals(out.fileId, "EF_1");
});

Deno.test("response-export-status: path-escapes both ids", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ status: "inProgress" }) }]);
  await responseExportStatus.execute({ surveyId: "SV/1", progressId: "ES 1" }, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV%2F1/export-responses/ES%201`);
});
