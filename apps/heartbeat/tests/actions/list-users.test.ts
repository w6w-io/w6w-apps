import { assertEquals } from "@std/assert";
import listUsers from "../../actions/list-users.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-users: wraps the vendor's bare array under `users`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "u1" }, { id: "u2" }] }]);
  const out = await listUsers.execute({}, ctx) as { users: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/users");
  assertEquals(out.users.length, 2);
});

Deno.test("list-users: takes no parameters — Heartbeat paginates nothing here", () => {
  assertEquals(listUsers.params?.length, 0);
});
