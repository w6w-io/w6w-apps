import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embeddings-create.ts";

Deno.test("embeddings-create: POSTs to /embeddings with default model", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ input: "hello world" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/embeddings");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input, "hello world");
  assertEquals(body.model, "text-embedding-3-small");
});

Deno.test("embeddings-create: forwards optional format + dimensions", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      input: ["a", "b"],
      model: "text-embedding-3-large",
      encodingFormat: "base64",
      dimensions: 256,
      user: "u1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input, ["a", "b"]);
  assertEquals(body.model, "text-embedding-3-large");
  assertEquals(body.encoding_format, "base64");
  assertEquals(body.dimensions, 256);
  assertEquals(body.user, "u1");
});
