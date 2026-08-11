import { assert, assertEquals, assertRejects } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-update: PUTs the fields it was given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await groupUpdate.execute({ groupId: "1", name: "Renamed", users: "9,10" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/groups/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { group: { name: "Renamed", users: ["9", "10"] } });
});

Deno.test("group-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await groupUpdate.execute({ groupId: "1" }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("group-update: warns that membership is replaced, not appended", () => {
  const users = groupUpdate.params!.find((p) => p.key === "users")!;
  assert(/REPLACES/.test(users.hint!), users.hint);
});
