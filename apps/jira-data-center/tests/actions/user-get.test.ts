import { assertEquals, assertRejects } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-get: GETs /user by username", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "jdoe", displayName: "Jane Doe" } }]);
  await userGet.execute({ username: "jdoe" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/user");
  assertEquals(queryOf(calls[0].url), { username: "jdoe" });
});

Deno.test("user-get: GETs /user by key when username is absent", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "JIRAUSER10100" } }]);
  await userGet.execute({ key: "JIRAUSER10100" }, ctx);
  assertEquals(queryOf(calls[0].url), { key: "JIRAUSER10100" });
});

Deno.test("user-get: rejects when neither username nor key is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await userGet.execute({}, ctx));
});
