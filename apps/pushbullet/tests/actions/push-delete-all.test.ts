import { assertEquals } from "@std/assert";
import pushDeleteAll from "../../actions/push-delete-all.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("push-delete-all: DELETEs /v2/pushes with no path parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await pushDeleteAll.execute({}, ctx) as { requested: boolean };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/pushes");
  assertEquals(out.requested, true);
});

Deno.test("push-delete-all: is declared idempotent — a repeat call deletes nothing further", () => {
  assertEquals(pushDeleteAll.idempotent, true);
});

Deno.test("push-delete-all: takes no params", () => {
  assertEquals(pushDeleteAll.params, []);
});
