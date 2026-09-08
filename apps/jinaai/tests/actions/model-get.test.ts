import { assertEquals } from "@std/assert";
import modelGet from "../../actions/model-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-get: calls GET /v1/models/{id} with the id escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "jina-ai/jina-embeddings-v3" } }]);
  const out = await modelGet.execute({ modelId: "jina-ai/jina-embeddings-v3" }, ctx) as {
    id: string;
  };

  assertEquals(pathOf(calls[0].url), "/v1/models/jina-ai%2Fjina-embeddings-v3");
  assertEquals(out.id, "jina-ai/jina-embeddings-v3");
  assertEquals(modelGet.requiresAuth, false);
});
