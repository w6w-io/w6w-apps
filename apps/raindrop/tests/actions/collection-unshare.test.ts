import { assert, assertEquals } from "@std/assert";
import collectionUnshare from "../../actions/collection-unshare.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collection-unshare: DELETEs /collection/{id}/sharing", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collectionUnshare.execute({ id: 8492393 }, ctx) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393/sharing");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out.result, true);
});

/**
 * One route, two outcomes chosen by who the connection is: an owner removes
 * every collaborator, a member removes only itself. Nothing in the request
 * distinguishes them, so the description is the only place a caller can find
 * out — which makes this assertion the guard on the one thing this action can
 * actually do about it.
 */
Deno.test("collection-unshare: the description spells out both outcomes", () => {
  const description = collectionUnshare.description ?? "";
  assert(/owns/i.test(description), description);
  assert(/ALL collaborators/i.test(description), description);
  assert(/only itself/i.test(description), description);
});
