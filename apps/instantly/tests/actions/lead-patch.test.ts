import { assertEquals } from "@std/assert";
import leadPatch from "../../actions/lead-patch.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-patch: PATCHes /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", first_name: "Jon" } }]);
  await leadPatch.execute({ id: "l1", first_name: "Jon" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads/l1");
  assertEquals(JSON.parse(calls[0].body!).first_name, "Jon");
});

Deno.test("lead-patch: is declared idempotent", () => {
  assertEquals(leadPatch.idempotent, true);
});
