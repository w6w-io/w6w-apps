import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: calls GET /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", page_id: "p1" } }]);
  const out = await leadGet.execute({ leadId: "l1" }, ctx) as { page_id: string };

  assertEquals(pathOf(calls[0].url), "/leads/l1");
  assertEquals(out.page_id, "p1");
});
