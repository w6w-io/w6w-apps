import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: POSTs /search with the query and default type omitted when unset", async () => {
  const body = { requestId: "r1", results: [{ id: "https://x", title: "X", url: "https://x" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ query: "LLM capabilities" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/search");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, "LLM capabilities");
  assertEquals(sent.type, undefined);
  assertEquals(sent.contents, undefined);
  assertEquals(result, body);
});

Deno.test("search: forwards search mode, filters, and domain lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1", results: [] } }]);
  await action.execute!(
    {
      query: "climate tech",
      type: "deep",
      numResults: 25,
      includeDomains: ["arxiv.org", "exa.ai/blog"],
      excludeDomains: ["docs.python.org/3"],
      category: "news",
      startPublishedDate: "2026-01-01T00:00:00.000Z",
      userLocation: "US",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.type, "deep");
  assertEquals(sent.numResults, 25);
  assertEquals(sent.includeDomains, ["arxiv.org", "exa.ai/blog"]);
  assertEquals(sent.excludeDomains, ["docs.python.org/3"]);
  assertEquals(sent.category, "news");
  assertEquals(sent.startPublishedDate, "2026-01-01T00:00:00.000Z");
  assertEquals(sent.userLocation, "US");
});

Deno.test("search: nests text/highlights/summary/maxAgeHours under `contents` (never top-level)", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1", results: [] } }]);
  await action.execute!(
    { query: "x", text: true, highlights: true, maxAgeHours: 0 },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.text, undefined);
  assertEquals(sent.highlights, undefined);
  assertEquals(sent.contents.text, true);
  assertEquals(sent.contents.highlights, true);
  assertEquals(sent.contents.maxAgeHours, 0);
  assertEquals("summary" in sent.contents, false);
});
