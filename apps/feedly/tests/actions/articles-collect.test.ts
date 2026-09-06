import { assertEquals } from "@std/assert";
import articlesCollect from "../../actions/articles-collect.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("articles-collect: builds the documented query and passes the response through", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "enterprise/acme/category/x", updated: 1, continuation: "c1", items: [{}] } },
  ]);
  const out = await articlesCollect.execute(
    { streamId: "enterprise/acme/category/x", count: 5, newerThan: 100, similar: false },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/streams/contents");
  const q = queryOf(calls[0].url);
  assertEquals(q.streamId, "enterprise/acme/category/x");
  assertEquals(q.count, "5");
  assertEquals(q.newerThan, "100");
  assertEquals(q.similar, "false");
  assertEquals((out as { continuation: string }).continuation, "c1");
});

Deno.test("articles-collect: omits unset optional params from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await articlesCollect.execute({ streamId: "feed/https://example.com/rss" }, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(Object.keys(q).sort(), ["streamId"]);
});

Deno.test("articles-collect: requires no credential in its own code", async () => {
  const src = await Deno.readTextFile(
    new URL("../../actions/articles-collect.ts", import.meta.url),
  );
  assertEquals(/credential/i.test(src), false);
});
