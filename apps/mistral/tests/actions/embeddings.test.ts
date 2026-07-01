import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embeddings.ts";

Deno.test("embeddings: POSTs /v1/embeddings with default model", async () => {
  const body = { data: [{ embedding: [0.1, 0.2] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ input: "hello" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/embeddings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "mistral-embed",
    input: "hello",
  });
  assertEquals(result, body);
});

Deno.test("embeddings: forwards array input verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ input: ["a", "b", "c"] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.input, ["a", "b", "c"]);
});

Deno.test("embeddings: forwards encodingFormat as snake_case when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "x", encodingFormat: "base64", model: "mistral-embed" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.encoding_format, "base64");
});

Deno.test("embeddings: omits encoding_format when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "x" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("encoding_format" in sent, false);
});
