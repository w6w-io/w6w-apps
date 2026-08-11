import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-file.ts";

Deno.test("upload-file: a file name addresses the parent and creates a new child", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "new" } }]);
  await action.execute({ itemId: "P1", name: "notes.txt", content: "hi" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/items/P1:/notes.txt:/content",
  );
  assertEquals(calls[0].method, "PUT");
});

Deno.test("upload-file: a parent path and a file name compose into the root: form", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({ itemPath: "FolderA", name: "FileB.txt", content: "x" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/FolderA/FileB.txt:/content",
  );
});

Deno.test("upload-file: no file name means replace the addressed item's contents", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "01ABC", content: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC/content");
});

Deno.test("upload-file: sends the content verbatim under the declared content type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "a.csv", content: "a,b\n1,2", contentType: "text/csv" }, ctx);
  assertEquals(calls[0].body, "a,b\n1,2");
  assertEquals(calls[0].headers["content-type"], "text/csv");
});

Deno.test("upload-file: defaults to text/plain, the reference's own example", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ name: "a.txt", content: "x" }, ctx);
  assertEquals(calls[0].headers["content-type"], "text/plain");
});

Deno.test("upload-file: offers no binary/base64 input — the sandbox stringifies bodies", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("contentBase64"), false);
  assertEquals((action.params ?? []).find((p) => p.key === "content")?.type, "text");
});

Deno.test("upload-file: a `/` in the file name is refused, not silently re-homed", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ name: "a/b.txt", content: "x" }, ctx) as Promise<unknown>,
    Error,
    "must not contain",
  );
});

Deno.test("upload-file: with no name and no item, there is nothing to replace", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ content: "x" }, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});

Deno.test("upload-file: is idempotent — a PUT's conflict behaviour is `replace`", () => {
  assertEquals(action.idempotent, true);
});
