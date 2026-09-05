import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("file-upload: POSTs multipart/form-data to /k/v1/file.json and returns fileKey", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { fileKey: "20150417ABC" } }], conn);
  const content = btoa("hello world");
  const out = await action.execute(
    { fileName: "hello.txt", content, encoding: "base64", contentType: "text/plain" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/file.json");
  assertEquals(calls[0].body, "[FormData]");
  assertEquals(out, { fileKey: "20150417ABC" });
});

Deno.test("file-upload: plain-text encoding sends the string verbatim", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { fileKey: "x" } }], conn);
  const out = await action.execute(
    { fileName: "a.txt", content: "plain text", encoding: "utf8" },
    ctx,
  );
  assertEquals(out.fileKey, "x");
});
