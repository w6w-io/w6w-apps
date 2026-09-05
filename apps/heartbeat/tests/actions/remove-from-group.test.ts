import { assertEquals } from "@std/assert";
import removeFromGroup from "../../actions/remove-from-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("remove-from-group: DELETE /groups/{id}/memberships with the email list in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await removeFromGroup.execute({ groupID: "g1", emails: ["a@b.com"] }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1/memberships");
  assertEquals(JSON.parse(calls[0].body!), { emails: ["a@b.com"] });
});

Deno.test("remove-from-group: is idempotent", () => {
  assertEquals(removeFromGroup.idempotent, true);
});
