import { assert, assertEquals } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-create: nests name and user IDS under group", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await groupCreate.execute({ name: "Crew", users: ["9", "10"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/groups");
  assertEquals(bodyOf(calls[0]), { group: { name: "Crew", users: ["9", "10"] } });
});

Deno.test("group-create: omits users when none are given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await groupCreate.execute({ name: "Crew" }, ctx);
  assertEquals(bodyOf(calls[0]), { group: { name: "Crew" } });
});

Deno.test("group-create: says the members are ids, unlike tags which are display values", () => {
  const users = groupCreate.params!.find((p) => p.key === "users")!;
  assert(/User IDs, not email/.test(users.hint!), users.hint);
  assertEquals(groupCreate.idempotent, false);
});
