import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-model.ts";

Deno.test("get-model: GETs /openai/v1/models/{model}", async () => {
  const body = { id: "llama-3.3-70b-versatile", object: "model", owned_by: "Meta" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ model: "llama-3.3-70b-versatile" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models/llama-3.3-70b-versatile");
  assertEquals(result, body);
});

Deno.test("get-model: URL-encodes the model id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "some/model id" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models/some%2Fmodel%20id");
});
