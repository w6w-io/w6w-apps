import { assertEquals } from "@std/assert";
import squadGet from "../../actions/squad-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("squad-get: calls GET /squad/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sq1", name: "Sales team" } }]);
  const out = await squadGet.execute({ id: "sq1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/squad/sq1");
  assertEquals(out, { id: "sq1", name: "Sales team" });
});
