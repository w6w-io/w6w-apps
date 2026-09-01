import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/find-similar.ts";

Deno.test("find-similar: POSTs /findSimilar with the seed url", async () => {
  const body = { requestId: "r1", results: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ url: "https://arxiv.org/abs/2307.06435" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/findSimilar");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.url, "https://arxiv.org/abs/2307.06435");
  assertEquals(sent.excludeSourceDomain, undefined);
  assertEquals(result, body);
});

Deno.test("find-similar: forwards excludeSourceDomain and result filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1", results: [] } }]);
  await action.execute!(
    { url: "https://x", excludeSourceDomain: true, numResults: 5, category: "company" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.excludeSourceDomain, true);
  assertEquals(sent.numResults, 5);
  assertEquals(sent.category, "company");
});
