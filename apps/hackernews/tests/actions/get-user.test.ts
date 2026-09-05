import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-user.ts";

Deno.test("get-user: GETs /v0/user/:id.json and returns the profile", async () => {
  const { ctx, calls } = mockCtx([
    { body: { about: "This is a test", created: 1173923446, id: "jl", karma: 2937 } },
  ]);
  const out = await action.execute({ id: "jl" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/user/jl.json");
  assertEquals(out?.id, "jl");
  assertEquals(out?.karma, 2937);
});

Deno.test("get-user: URL-encodes the username", async () => {
  const { ctx, calls } = mockCtx([{ body: "null" }]);
  await action.execute({ id: "weird/name" }, ctx);
  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/user/weird%2Fname.json");
});

Deno.test("get-user: a bogus username answers 200 null, passed through unchanged", async () => {
  const { ctx } = mockCtx([{ body: "null" }]);
  const out = await action.execute({ id: "this-user-should-not-exist-xyz" }, ctx);
  assertEquals(out, null);
});
