import { assertEquals } from "@std/assert";
import articlesGetMultiple from "../../actions/articles-get-multiple.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("articles-get-multiple: posts a bare array body, per the vendor's .mget shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "e1" }, { id: "e2" }] }]);
  const out = await articlesGetMultiple.execute({ entryIds: ["e1", "e2"] }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/entries/.mget");
  assertEquals(JSON.parse(calls[0].body!), ["e1", "e2"]);
  assertEquals(out, [{ id: "e1" }, { id: "e2" }]);
});

Deno.test("articles-get-multiple: caps the request at the documented 1,000-entry limit", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const ids = Array.from({ length: 1500 }, (_, i) => `e${i}`);
  await articlesGetMultiple.execute({ entryIds: ids }, ctx);

  const sent = JSON.parse(calls[0].body!) as string[];
  assertEquals(sent.length, 1000);
  assertEquals(sent[0], "e0");
  assertEquals(sent[999], "e999");
});
