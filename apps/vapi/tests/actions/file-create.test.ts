import { assert, assertEquals } from "@std/assert";
import fileCreate from "../../actions/file-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-create: POSTs a hand-built multipart body to /file", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1", name: "notes.txt" } }]);
  const out = await fileCreate.execute({ fileName: "notes.txt", content: "hello world" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/file");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data; boundary="));
  assert(calls[0].body!.includes('name="file"; filename="notes.txt"'));
  assert(calls[0].body!.includes("hello world"));
  assertEquals(out, { id: "f1", name: "notes.txt" });
});

Deno.test("file-create: includes purpose and JSON-encoded metadata parts when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1" } }]);
  await fileCreate.execute(
    { fileName: "a.txt", content: "x", purpose: "assistant", metadata: { source: "workflow" } },
    ctx,
  );

  assert(calls[0].body!.includes('name="purpose"'));
  assert(calls[0].body!.includes("assistant"));
  assert(calls[0].body!.includes('name="metadata"'));
  assert(calls[0].body!.includes('{"source":"workflow"}'));
});

Deno.test("file-create: a filename that could break the header is sanitised", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "f1" } }]);
  await fileCreate.execute({ fileName: 'evil".txt', content: "x" }, ctx);
  assert(!calls[0].body!.includes('evil".txt'));
});

Deno.test("file-create: is not idempotent", () => {
  assertEquals(fileCreate.idempotent, false);
});
