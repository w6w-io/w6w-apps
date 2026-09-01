import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-contents.ts";

Deno.test("get-contents: POSTs /contents with urls, and content options flattened at the TOP level (not nested)", async () => {
  const body = { requestId: "r1", results: [], statuses: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { urls: ["https://arxiv.org/pdf/2307.06435"], text: true, summary: true },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contents");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.urls, ["https://arxiv.org/pdf/2307.06435"]);
  // Unlike /search and /findSimilar, /contents merges ContentsOptions at the
  // request root — there is no `contents` wrapper key on this endpoint.
  assertEquals(sent.contents, undefined);
  assertEquals(sent.text, true);
  assertEquals(sent.summary, true);
  assertEquals(result, body);
});

Deno.test("get-contents: supports multiple urls in one call", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1", results: [] } }]);
  await action.execute!({ urls: ["https://a", "https://b"] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.urls, ["https://a", "https://b"]);
});
