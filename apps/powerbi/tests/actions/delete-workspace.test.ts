import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-workspace.ts";

Deno.test("delete-workspace: DELETEs /groups/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.status, 200);
});

Deno.test("delete-workspace: treated as idempotent — deleting twice converges on gone", () => {
  assertEquals(action.idempotent, true);
});
