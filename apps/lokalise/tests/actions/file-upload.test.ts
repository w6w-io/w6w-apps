import { assertEquals } from "@std/assert";
import fileUpload from "../../actions/file-upload.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-upload: sends the required fields and returns the queued process, not keys", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 202,
      body: { project_id: "p1", process: { process_id: "pr_1", status: "queued" } },
    },
  ]);
  const out = await fileUpload.execute(
    { projectId: "p1", filename: "index.json", data: "eyJhIjoxfQ==", langIso: "en" },
    ctx,
  ) as { process: { process_id: string; status: string } };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/files/upload");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    filename: "index.json",
    data: "eyJhIjoxfQ==",
    lang_iso: "en",
  });
  assertEquals(out.process.status, "queued");
});

Deno.test("file-upload: required fields cannot be overridden by extraOptions", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await fileUpload.execute(
    {
      projectId: "p1",
      filename: "index.json",
      data: "AAAA",
      langIso: "en",
      extraOptions: '{"filename":"malicious.json","tags":["a"]}',
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filename, "index.json");
  assertEquals(body.tags, ["a"]);
});

Deno.test("file-upload: forwards named import options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await fileUpload.execute(
    {
      projectId: "p1",
      filename: "index.json",
      data: "AAAA",
      langIso: "en",
      convertPlaceholders: true,
      distinguishByFile: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.convert_placeholders, true);
  assertEquals(body.distinguish_by_file, true);
});

Deno.test("file-upload: is not idempotent — every call queues a new import", () => {
  assertEquals(fileUpload.idempotent, false);
});
