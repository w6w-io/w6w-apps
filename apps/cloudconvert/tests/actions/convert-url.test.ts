import { assertEquals, assertRejects } from "@std/assert";
import convertUrl from "../../actions/convert-url.ts";
import { hostOf, mockCtx, pathOf } from "../_helpers.ts";

const FINISHED = {
  data: {
    id: "j1",
    status: "finished",
    tasks: [
      { id: "t1", name: "import-1", operation: "import/url", status: "finished" },
      { id: "t2", name: "convert-1", operation: "convert", status: "finished" },
      {
        id: "t3",
        name: "export-1",
        operation: "export/url",
        status: "finished",
        result: {
          files: [{ filename: "out.pdf", url: "https://storage.cloudconvert.com/x/out.pdf" }],
        },
      },
    ],
  },
};

const FAILED = {
  data: {
    id: "j2",
    status: "error",
    tasks: [
      { id: "t1", name: "import-1", operation: "import/url", status: "finished" },
      {
        id: "t2",
        name: "convert-1",
        operation: "convert",
        status: "error",
        message: "Failed to open the file",
        code: "OPEN_FAILED",
      },
    ],
  },
};

Deno.test("convert-url: builds the import/url -> convert -> export/url graph on the sync host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: FINISHED }]);
  await convertUrl.execute(
    { url: "https://example.com/in.docx", outputFormat: "pdf" },
    ctx,
  );
  assertEquals(hostOf(calls[0].url), "sync.api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tasks["import-1"].operation, "import/url");
  assertEquals(body.tasks["import-1"].url, "https://example.com/in.docx");
  assertEquals(body.tasks["convert-1"].operation, "convert");
  assertEquals(body.tasks["convert-1"].input, "import-1");
  assertEquals(body.tasks["convert-1"].output_format, "pdf");
  assertEquals(body.tasks["export-1"].operation, "export/url");
  assertEquals(body.tasks["export-1"].input, "convert-1");
});

Deno.test("convert-url: returns the export task's files on success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: FINISHED }]);
  const out = await convertUrl.execute(
    { url: "https://example.com/in.docx", outputFormat: "pdf" },
    ctx,
  );
  assertEquals(out.jobId, "j1");
  assertEquals(out.status, "finished");
  assertEquals(out.files, [{
    filename: "out.pdf",
    url: "https://storage.cloudconvert.com/x/out.pdf",
  }]);
});

Deno.test("convert-url: throws with the failing task's message and code on job status error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: FAILED }]);
  await assertRejects(
    async () =>
      await convertUrl.execute({ url: "https://example.com/in.docx", outputFormat: "pdf" }, ctx),
    Error,
    "OPEN_FAILED",
  );
});

Deno.test("convert-url: rejects malformed 'additional options' JSON before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await convertUrl.execute(
        { url: "https://x", outputFormat: "pdf", options: "{not json" },
        ctx,
      ),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("convert-url: merges 'additional options' without letting them override output_format", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: FINISHED }]);
  await convertUrl.execute(
    {
      url: "https://example.com/in.docx",
      outputFormat: "pdf",
      options: JSON.stringify({ output_format: "png", pages: "1-2" }),
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tasks["convert-1"].output_format, "pdf");
  assertEquals(body.tasks["convert-1"].pages, "1-2");
});

Deno.test("convert-url: is declared non-idempotent", () => {
  assertEquals(convertUrl.idempotent, false);
});
