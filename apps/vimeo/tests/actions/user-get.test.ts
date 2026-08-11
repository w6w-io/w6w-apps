import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, q, url } from "../_helpers.ts";

const me = { uri: "/users/152184", name: "Test Account", link: "https://vimeo.com/test" };

Deno.test("user-get: defaults to the /me alias", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  const out = await userGet.execute({}, ctx) as typeof me;
  assertEquals(url(calls[0]).pathname, "/me");
  assertEquals(out.uri, "/users/152184");
});

Deno.test("user-get: fetches another user by id or URI", async () => {
  const { ctx, calls } = mockCtx([{ body: me }, { body: me }]);
  await userGet.execute({ userId: "152184" }, ctx);
  assertEquals(url(calls[0]).pathname, "/users/152184");
  await userGet.execute({ userId: "/users/152184" }, ctx);
  assertEquals(url(calls[1]).pathname, "/users/152184");
});

Deno.test("user-get: forwards the fields filter", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  await userGet.execute({ fields: "uri, name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("user-get: is a read action", () => {
  assertEquals(userGet.type, "read");
});
