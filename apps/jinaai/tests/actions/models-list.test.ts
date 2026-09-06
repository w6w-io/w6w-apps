import { assertEquals } from "@std/assert";
import modelsList from "../../actions/models-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("models-list: calls GET /v1/models and does not require auth", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "jina-ai/jina-embeddings-v3" }] } }]);
  const out = await modelsList.execute({}, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/models");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(modelsList.requiresAuth, false);
  assertEquals(out.data.length, 1);
});
