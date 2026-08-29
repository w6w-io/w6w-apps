import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embeddings.ts";

Deno.test("embeddings: POSTs /embeddings with model and input", async () => {
  const body = { data: [{ embedding: [0.1, 0.2] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { model: "openai/text-embedding-3-small", input: "hello world" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/embeddings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "openai/text-embedding-3-small",
    input: "hello world",
  });
  assertEquals(result, body);
});

Deno.test("embeddings: forwards an array input for batch requests", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "openai/text-embedding-3-small", input: ["a", "b", "c"] },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.input, ["a", "b", "c"]);
});

Deno.test("embeddings: forwards dimensions and encoding_format when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "openai/text-embedding-3-small",
      input: "hi",
      dimensions: 256,
      encodingFormat: "base64",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.dimensions, 256);
  assertEquals(sent.encoding_format, "base64");
});

Deno.test("embeddings: omits dimensions/encoding_format when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "m", input: "x" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["input", "model"]);
});
