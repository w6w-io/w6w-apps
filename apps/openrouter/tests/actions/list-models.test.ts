import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-models.ts";

Deno.test("list-models: GETs /models with no query params by default", async () => {
  const body = { data: [{ id: "openai/gpt-5.2" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/models");
  assertEquals(url.search, "");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});

Deno.test("list-models: forwards q, category, limit and offset as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { q: "gpt-4", category: "programming", limit: 50, offset: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("q"), "gpt-4");
  assertEquals(url.searchParams.get("category"), "programming");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});
