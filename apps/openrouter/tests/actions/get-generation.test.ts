import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-generation.ts";

Deno.test("get-generation: GETs /generation?id=... and returns the vendor's body", async () => {
  const body = { data: { id: "gen-abc123", total_cost: 0.0015, tokens_prompt: 10 } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ id: "gen-abc123" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/generation");
  assertEquals(url.searchParams.get("id"), "gen-abc123");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
