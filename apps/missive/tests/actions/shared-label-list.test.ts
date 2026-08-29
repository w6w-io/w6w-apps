import { assertEquals } from "@std/assert";
import action from "../../actions/shared-label-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("shared-label-list: lists shared labels", async () => {
  const { ctx, calls } = mockCtx([{ body: { shared_labels: [{ id: "l1" }] } }]);
  const out = await action.execute({ organization: "org-1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/shared_labels");
  assertEquals(out, [{ id: "l1" }]);
});
