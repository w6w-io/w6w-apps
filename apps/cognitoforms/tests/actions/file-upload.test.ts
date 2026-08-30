import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

Deno.test("file-upload: POSTs a multipart body to /files", async () => {
  const { ctx, calls } = mockCtx([
    { body: { Id: "F-1", Name: "hi.txt", ContentType: "application/octet-stream", Size: 2 } },
  ]);
  const result = await action.execute({ file: btoa("hi"), fileName: "hi.txt" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/files");
  assertEquals(calls[0].headers["content-type"], undefined);
  assert(calls[0].rawBody instanceof FormData);
  const file = (calls[0].rawBody as FormData).get("File") as File;
  assertEquals(file.name, "hi.txt");
  assertEquals(await file.text(), "hi");
  assertEquals(result, {
    Id: "F-1",
    Name: "hi.txt",
    ContentType: "application/octet-stream",
    Size: 2,
  });
});

Deno.test("file-upload: defaults the file name when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "F-2" } }]);
  await action.execute({ file: btoa("x") }, ctx);
  const file = (calls[0].rawBody as FormData).get("File") as File;
  assertEquals(file.name, "upload.bin");
});

Deno.test("file-upload: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
