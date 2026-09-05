import { assertEquals } from "@std/assert";
import getUser from "../../actions/get-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-user: fetches by id, no envelope to unwrap", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.com", name: "Dwight" } }]);
  const out = await getUser.execute({ userID: "u1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/users/u1");
  assertEquals(out.email, "a@b.com");
});

Deno.test("get-user: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a/b" } }]);
  await getUser.execute({ userID: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v0/users/a%2Fb");
});
