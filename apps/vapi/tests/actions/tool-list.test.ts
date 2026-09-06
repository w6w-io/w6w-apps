import { assertEquals } from "@std/assert";
import toolList from "../../actions/tool-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tool-list: calls GET /tool", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "t1", type: "function" }] }]);
  const out = await toolList.execute({ createdAtLt: "2026-01-01T00:00:00Z" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/tool");
  assertEquals(queryOf(calls[0].url), { createdAtLt: "2026-01-01T00:00:00Z" });
  assertEquals(out, { items: [{ id: "t1", type: "function" }] });
});
