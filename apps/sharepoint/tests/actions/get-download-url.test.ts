import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-download-url.ts";

Deno.test("get-download-url: reads @microsoft.graph.downloadUrl off a plain metadata GET", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      id: "F1",
      name: "notes.txt",
      size: 5,
      file: { mimeType: "text/plain" },
      "@microsoft.graph.downloadUrl": "https://contoso.sharepoint.com/_layouts/download?x=1",
    },
  }]);
  const out = await action.execute({ itemId: "F1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive/items/F1");
  // No $select — the annotation is on the default representation only.
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), null);
  assertEquals(out, {
    id: "F1",
    name: "notes.txt",
    size: 5,
    mimeType: "text/plain",
    downloadUrl: "https://contoso.sharepoint.com/_layouts/download?x=1",
  });
});

Deno.test("get-download-url: neither Item ID nor Item path is a legible error, never the library root", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => action.execute({}, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-download-url: a folder gets a specific error, not a generic one", async () => {
  const { ctx } = mockCtx([{ body: { id: "D1", name: "Reports", folder: {} } }]);
  await assertRejects(
    () => action.execute({ itemId: "D1" }, ctx) as Promise<unknown>,
    Error,
    "is a folder",
  );
});

Deno.test("get-download-url: a file with no download URL at all still errors, distinctly", async () => {
  const { ctx } = mockCtx([{ body: { id: "F1", name: "ghost.txt" } }]);
  const err = await assertRejects(
    () => action.execute({ itemId: "F1" }, ctx) as Promise<unknown>,
    Error,
  );
  assert(err.message.includes("no @microsoft.graph.downloadUrl"), err.message);
});
