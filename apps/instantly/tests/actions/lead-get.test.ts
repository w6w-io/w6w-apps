import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: GETs /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", email: "a@b.com" } }]);
  const out = await leadGet.execute({ id: "l1" }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/leads/l1");
  assertEquals(out.id, "l1");
});
