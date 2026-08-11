import { assertEquals } from "@std/assert";
import collaboratorRemove from "../../actions/collaborator-remove.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collaborator-remove: DELETEs /collection/{id}/sharing/{userId}", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collaboratorRemove.execute({ id: 8492393, userId: 373381 }, ctx) as {
    result: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393/sharing/373381");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out.result, true);
});

/**
 * The targeted counterpart to Unshare, whose behaviour depends on who is asking.
 * This one names its target, so it must always carry the user segment.
 */
Deno.test("collaborator-remove: always addresses a named user", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await collaboratorRemove.execute({ id: 1, userId: 2 }, ctx);
  assertEquals(pathOf(calls[0].url).split("/").length, 7);
  assertEquals(collaboratorRemove.idempotent, true);
});
