import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-download-url.ts";

const DOWNLOAD = "https://contoso-my.sharepoint.com/personal/_layouts/download.aspx?token=abc";

Deno.test("get-download-url: reads the item's metadata, not /content", async () => {
  // /content answers 302 to a per-tenant storage host, which this App does not
  // declare in network.allow — so the annotation is read off the item instead.
  const { ctx, calls } = mockCtx([{
    body: { id: "01ABC", name: "a.txt", "@microsoft.graph.downloadUrl": DOWNLOAD },
  }]);
  await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC");
  assert(!calls[0].url.includes("/content"), calls[0].url);
});

Deno.test("get-download-url: sends no $select, which would drop the annotation", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "1", "@microsoft.graph.downloadUrl": DOWNLOAD },
  }]);
  await action.execute({ itemId: "1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-download-url: makes exactly one request and never leaves graph.microsoft.com", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "1", "@microsoft.graph.downloadUrl": DOWNLOAD },
  }]);
  await action.execute({ itemId: "1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).hostname, "graph.microsoft.com");
});

Deno.test("get-download-url: projects the fields worth carrying downstream", async () => {
  const { ctx } = mockCtx([{
    body: {
      id: "01ABC",
      name: "a.txt",
      size: 35,
      file: { mimeType: "text/plain" },
      "@microsoft.graph.downloadUrl": DOWNLOAD,
    },
  }]);
  assertEquals(await action.execute({ itemId: "01ABC" }, ctx), {
    id: "01ABC",
    name: "a.txt",
    size: 35,
    mimeType: "text/plain",
    downloadUrl: DOWNLOAD,
  });
});

Deno.test("get-download-url: a folder is named as the cause rather than returning nothing", async () => {
  const { ctx } = mockCtx([{ body: { id: "f", name: "Reports", folder: { childCount: 2 } } }]);
  await assertRejects(
    () => action.execute({ itemId: "f" }, ctx) as Promise<unknown>,
    Error,
    "is a folder",
  );
});

Deno.test("get-download-url: an item without a download URL fails loudly", async () => {
  const { ctx } = mockCtx([{ body: { id: "x", name: "odd.bin" } }]);
  await assertRejects(
    () => action.execute({ itemId: "x" }, ctx) as Promise<unknown>,
    Error,
    "downloadUrl",
  );
});

Deno.test("get-download-url: requires an item — the drive root is not a file", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({}, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});
