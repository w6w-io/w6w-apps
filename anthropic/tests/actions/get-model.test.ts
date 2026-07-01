import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-model.ts";

Deno.test("get-model: GETs /v1/models/{id}", async () => {
  const body = { id: "claude-opus-4-1-20250805", display_name: "Claude Opus 4.1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ modelId: "claude-opus-4-1-20250805" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/models/claude-opus-4-1-20250805");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(result, body);
});
