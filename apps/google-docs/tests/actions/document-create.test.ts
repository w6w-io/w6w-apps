import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create.ts";

Deno.test("document-create: POSTs to Drive with Docs MIME type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "doc-1", name: "Report" } }]);
  const result = await action.execute!({ title: "Report" }, ctx);

  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.googleapis.com");
  assertEquals(url.pathname, "/drive/v3/files");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    name: "Report",
    mimeType: "application/vnd.google-apps.document",
  });
  assertEquals(result, { id: "doc-1", name: "Report" });
});

Deno.test("document-create: adds parents when folderId is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ title: "R", folderId: "folder-9" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.parents, ["folder-9"]);
});

Deno.test("document-create: 'default' folder sentinel is ignored", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ title: "R", folderId: "default" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.parents, undefined);
});
