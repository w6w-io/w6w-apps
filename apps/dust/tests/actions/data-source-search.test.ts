import { assertEquals } from "@std/assert";
import dataSourceSearch from "../../actions/data-source-search.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("data-source-search: sends query, top_k and full_text as required params", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { documents: [] } }]);
  await dataSourceSearch.execute(
    { spaceId: "sp_1", dsId: "ds_1", query: "refund policy", topK: 5, fullText: true },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/spaces/sp_1/data_sources/ds_1/search`,
  );
  assertEquals(queryOf(calls[0].url), {
    query: "refund policy",
    top_k: "5",
    full_text: "true",
  });
});

Deno.test("data-source-search: defaults topK to 10 and fullText to false", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { documents: [] } }]);
  await dataSourceSearch.execute(
    { spaceId: "sp_1", dsId: "ds_1", query: "q" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).top_k, "10");
  assertEquals(queryOf(calls[0].url).full_text, "false");
});

Deno.test("data-source-search: forwards optional tag filters", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { documents: [] } }]);
  await dataSourceSearch.execute(
    { spaceId: "sp_1", dsId: "ds_1", query: "q", tagsIn: "public", tagsNot: "draft" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url).tags_in, "public");
  assertEquals(queryOf(calls[0].url).tags_not, "draft");
});
