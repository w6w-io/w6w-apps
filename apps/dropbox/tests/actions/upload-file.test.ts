import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-file.ts";

Deno.test("upload-file: POSTs to content endpoint with Dropbox-API-Arg and octet-stream body", async () => {
  const meta = { id: "id:abc", name: "invoice_1.txt", path_display: "/invoices/invoice_1.txt" };
  const { ctx, calls } = mockCtx([{ body: meta }]);
  const result = await action.execute!(
    { path: "/invoices/invoice_1.txt", content: "hello world" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://content.dropboxapi.com/2/files/upload");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/octet-stream");
  const arg = JSON.parse(calls[0].headers["dropbox-api-arg"]);
  assertEquals(arg.path, "/invoices/invoice_1.txt");
  assertEquals(arg.mode, "overwrite");
  assertEquals(arg.autorename, false);
  assertEquals(arg.mute, false);
  assert(calls[0].body !== null && calls[0].body.length > 0);
  assertEquals(result, meta);
});

Deno.test("upload-file: forwards mode/autorename/mute options", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { path: "/a.txt", content: "x", mode: "add", autorename: true, mute: true },
    ctx,
  );
  const arg = JSON.parse(calls[0].headers["dropbox-api-arg"]);
  assertEquals(arg.mode, "add");
  assertEquals(arg.autorename, true);
  assertEquals(arg.mute, true);
});
