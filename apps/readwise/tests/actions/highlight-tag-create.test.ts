import { assertEquals } from "@std/assert";
import highlightTagCreate from "../../actions/highlight-tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-tag-create: POSTs to the collection WITH a trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, name: "philosophy" } }]);
  await highlightTagCreate.execute({ highlightId: "59767830", name: "philosophy" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/highlights/59767830/tags/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "philosophy" });
});

Deno.test("highlight-tag-create: is not idempotent — no vendor de-dupe is documented", () => {
  assertEquals(highlightTagCreate.idempotent, false);
});
