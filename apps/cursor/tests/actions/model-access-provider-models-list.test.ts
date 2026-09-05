import { assertEquals } from "@std/assert";
import modelAccessProviderModelsList from "../../actions/model-access-provider-models-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("model-access-provider-models-list: calls GET .../providers/:provider/models", async () => {
  const { ctx, calls } = mockCtx([{ body: { models: [] } }]);
  await modelAccessProviderModelsList.execute({ provider: "anthropic" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/model-access/providers/anthropic/models");
  assertEquals(calls[0].method, "GET");
});
