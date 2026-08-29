import { assert, assertEquals, assertRejects } from "@std/assert";
import userArchive from "../../actions/user-archive.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-archive: DELETEs a bare array of ids, default deletionType=archive", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ success: true }) }]);
  const out = await userArchive.execute({ userIds: "1,2,3" }, ctx);
  assertEquals(pathOf(calls[0].url), "/users/v1/users");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), [1, 2, 3]);
  assertEquals(out, { success: true });
});

Deno.test("user-archive: deletionType is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ success: true }) }]);
  await userArchive.execute({ userIds: "5", deletionType: "delete" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deletionType"), "delete");
});

Deno.test("user-archive: refuses to call the API with no ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await userArchive.execute({ userIds: "" }, ctx);
  });
  assertEquals(calls.length, 0);
});

Deno.test("user-archive: idempotent", () => {
  assert(userArchive.idempotent);
});
