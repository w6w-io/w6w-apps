import { assertEquals } from "@std/assert";
import toolGet from "../../actions/tool-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-get: calls GET /tool/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", type: "function" } }]);
  const out = await toolGet.execute({ id: "t1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/tool/t1");
  assertEquals(out, { id: "t1", type: "function" });
});
