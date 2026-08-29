import { assertEquals } from "@std/assert";
import highlightGet from "../../actions/highlight-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-get: reads one highlight by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 13, text: "hello" } }]);
  const out = await highlightGet.execute({ highlightId: "13" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/13/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 13, text: "hello" });
});

Deno.test("highlight-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await highlightGet.execute({ highlightId: "13/../secret" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/13%2F..%2Fsecret/");
});
