import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-workspace-hook.ts";

Deno.test("delete-workspace-hook: DELETEs the target and reports deletion", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspace: "acme", uid: "abc-123" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces/acme/hooks/abc-123");
  assertEquals(result, { deleted: true, uid: "abc-123" });
});

Deno.test("delete-workspace-hook: is marked idempotent", () => {
  assertEquals(action.idempotent, true);
});
