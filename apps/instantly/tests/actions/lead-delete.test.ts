import { assertEquals } from "@std/assert";
import leadDelete from "../../actions/lead-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-delete: DELETEs /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  const out = await leadDelete.execute({ id: "l1" }, ctx) as { id: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/l1");
  assertEquals(out.id, "l1");
});
