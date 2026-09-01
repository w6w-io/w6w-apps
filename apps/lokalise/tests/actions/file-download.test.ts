import { assertEquals } from "@std/assert";
import fileDownload from "../../actions/file-download.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-download: returns the bundle_url and does not fetch it", async () => {
  const { ctx, calls } = mockCtx([
    { body: { project_id: "p1", bundle_url: "https://s3-eu-west-1.amazonaws.com/x/y.zip" } },
  ]);
  const out = await fileDownload.execute({ projectId: "p1", format: "json" }, ctx) as {
    bundle_url: string;
  };
  assertEquals(calls.length, 1, "must not follow the bundle_url with a second request");
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/files/download");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.bundle_url, "https://s3-eu-west-1.amazonaws.com/x/y.zip");
});

Deno.test("file-download: forwards named export options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await fileDownload.execute(
    {
      projectId: "p1",
      format: "json",
      originalFilenames: true,
      filterLangs: ["en", "fr"],
      exportSort: "a_z",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    format: "json",
    original_filenames: true,
    filter_langs: ["en", "fr"],
    export_sort: "a_z",
  });
});

Deno.test("file-download: format cannot be overridden by extraOptions", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await fileDownload.execute(
    { projectId: "p1", format: "json", extraOptions: '{"format":"xml","all_platforms":true}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.format, "json");
  assertEquals(body.all_platforms, true);
});

Deno.test("file-download: is a read action — an export creates no persistent state to retry into", () => {
  assertEquals(fileDownload.type, "read");
});
