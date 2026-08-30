import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-file.ts";

Deno.test("upload-file: with a File name, PUTs a new child under the addressed parent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "new" } }]);
  await action.execute({ itemId: "PARENT", name: "notes.txt", content: "hello" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/sites/root/drive/items/PARENT:/notes.txt:/content",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, "hello");
});

Deno.test("upload-file: with no File name, replaces the addressed item's own contents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "F1" } }]);
  await action.execute({ itemId: "F1", content: "hello" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive/items/F1/content");
});

Deno.test("upload-file: content type defaults to text/plain", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "F1", content: "hello" }, ctx);
  assertEquals(calls[0].headers["content-type"], "text/plain");
});

Deno.test("upload-file: an explicit content type is honoured", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "F1", content: "a,b\n1,2", contentType: "text/csv" }, ctx);
  assertEquals(calls[0].headers["content-type"], "text/csv");
});

Deno.test("upload-file: is idempotent — Graph's documented PUT conflict behaviour is replace", () => {
  assertEquals(action.idempotent, true);
});
