import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /v1/models with version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: "claude-opus-4-1" }], has_more: false } }]);
  await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/models");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
});

Deno.test("list-models: forwards pagination params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 50, after_id: "m_a", before_id: "m_b" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "50");
  assertEquals(params.get("after_id"), "m_a");
  assertEquals(params.get("before_id"), "m_b");
});

Deno.test("list-models: omits pagination params when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("limit"));
  assert(!params.has("after_id"));
});
