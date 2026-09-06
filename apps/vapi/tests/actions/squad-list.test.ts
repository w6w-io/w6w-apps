import { assertEquals } from "@std/assert";
import squadList from "../../actions/squad-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("squad-list: calls GET /squad", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "sq1" }] }]);
  const out = await squadList.execute({ limit: 25 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/squad");
  assertEquals(queryOf(calls[0].url), { limit: "25" });
  assertEquals(out, { items: [{ id: "sq1" }] });
});
