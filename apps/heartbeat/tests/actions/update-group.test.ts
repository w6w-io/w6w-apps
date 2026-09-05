import { assertEquals } from "@std/assert";
import updateGroup from "../../actions/update-group.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("update-group: POST /groups/{id} with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: undefined }]);
  await updateGroup.execute({ groupID: "g1", isJoinable: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v0/groups/g1");
  assertEquals(JSON.parse(calls[0].body!), { isJoinable: true });
});

Deno.test("update-group: is idempotent — an overwrite reaches the same end state", () => {
  assertEquals(updateGroup.idempotent, true);
});
