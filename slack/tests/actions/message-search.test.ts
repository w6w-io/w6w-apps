import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-search.ts";

Deno.test("message-search: POSTs /search.messages with relevance → sort=score", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, messages: { matches: [] } } }]);
  await action.execute!({ query: "hello", sort: "relevance" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/search.messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("query"), "hello");
  assertEquals(url.searchParams.get("sort"), "score");
  assertEquals(url.searchParams.get("sort_dir"), "desc");
  assertEquals(url.searchParams.get("count"), "20");
});

Deno.test("message-search: sort=asc → timestamp/asc", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, messages: { matches: [] } } }]);
  await action.execute!({ query: "hi", sort: "asc" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("sort"), "timestamp");
  assertEquals(params.get("sort_dir"), "asc");
});
