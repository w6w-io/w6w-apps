import { assertEquals } from "@std/assert";
import action from "../../actions/shared-label-update.ts";
import { assertActionRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shared-label-update: patches by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { shared_labels: [{ id: "l1", name: "Updated" }] } }]);
  const out = await action.execute({ id: "l1", name: "Updated", color: "#f96885" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/shared_labels/l1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(out, { id: "l1", name: "Updated" });
});

Deno.test("shared-label-update: requires id", async () => {
  const { ctx } = mockCtx([]);
  await assertActionRejects(() => action.execute({ id: "" }, ctx));
});
