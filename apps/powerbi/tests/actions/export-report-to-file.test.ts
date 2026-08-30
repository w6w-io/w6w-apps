import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/export-report-to-file.ts";

Deno.test("export-report-to-file: POSTs ExportTo with { format }", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { id: "exp1", status: "NotStarted" } }]);
  const out = await action.execute({ reportId: "r1", format: "PDF" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/reports/r1/ExportTo");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { format: "PDF" });
  assertEquals(out.id, "exp1");
});

Deno.test("export-report-to-file: workspace-scoped path when Workspace ID is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute({ groupId: "w1", reportId: "r1", format: "PPTX" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/reports/r1/ExportTo");
});

Deno.test("export-report-to-file: report/paginated configurations pass through as raw JSON when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  await action.execute({
    reportId: "r1",
    format: "PDF",
    powerBIReportConfiguration: { pages: [{ pageName: "ReportSection1" }] },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.powerBIReportConfiguration, { pages: [{ pageName: "ReportSection1" }] });
  assertEquals("paginatedReportConfiguration" in body, false);
});

Deno.test("export-report-to-file: every call starts a brand-new job — not idempotent", () => {
  assertEquals(action.idempotent, false);
});
