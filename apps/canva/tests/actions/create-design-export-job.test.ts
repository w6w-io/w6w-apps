import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-design-export-job.ts";

Deno.test("create-design-export-job: builds a pdf format body", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "e1", status: "in_progress" } } }]);
  const result = await action.execute({
    designId: "DAabc",
    format: "pdf",
    exportQuality: "pro",
    pdfSize: "a4",
    pages: [1, 2],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/exports");
  assertEquals(JSON.parse(calls[0].body!), {
    design_id: "DAabc",
    format: { type: "pdf", export_quality: "pro", size: "a4", pages: [1, 2] },
  });
  assertEquals(result, { id: "e1", status: "in_progress" });
});

Deno.test("create-design-export-job: builds a jpg format body with quality", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: {} } }]);
  await action.execute({ designId: "DAabc", format: "jpg", jpgQuality: 80, width: 1000 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.format, { type: "jpg", quality: 80, width: 1000 });
});

Deno.test("create-design-export-job: builds a mp4 format body", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: {} } }]);
  await action.execute({ designId: "DAabc", format: "mp4", mp4Quality: "horizontal_1080p" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.format, { type: "mp4", quality: "horizontal_1080p" });
});

Deno.test("create-design-export-job: builds a pages-only format body for pptx/csv/html", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: {} } }]);
  await action.execute({ designId: "DAabc", format: "pptx", pages: [1] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.format, { type: "pptx", pages: [1] });
});
