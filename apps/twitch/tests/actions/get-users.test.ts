import { assertEquals, assertRejects } from "@std/assert";
import getUsers from "../../actions/get-users.ts";
import { helixError, mockCtx, page, pathOf, queryAll } from "../_helpers.ts";

Deno.test("get-users: calls GET /helix/users", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "141981764", login: "twitchdev" }]) }]);
  const out = await getUsers.execute({ login: "twitchdev" }, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/helix/users");
  assertEquals(out.data.length, 1);
});

/**
 * The single most damaging Twitch mistake this app can make: comma-joining a
 * multi-valued parameter does not error, it looks up one nonexistent user and
 * returns an empty list.
 */
Deno.test("get-users: multiple IDs are sent as REPEATED keys, never comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await getUsers.execute({ id: "1234, 5678", login: ["foo", "bar"] }, ctx);

  assertEquals(queryAll(calls[0].url, "id"), ["1234", "5678"]);
  assertEquals(queryAll(calls[0].url, "login"), ["foo", "bar"]);
  assertEquals(calls[0].url.includes("1234%2C5678"), false, "ids were comma-joined");
});

/** Both params empty is legal — it means "the user access token's own user". */
Deno.test("get-users: sends no query at all when neither ID nor login is given", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "1" }]) }]);
  await getUsers.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-users: a Helix error surfaces the vendor's own message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: helixError("Unauthorized", 401, "Invalid OAuth token") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(getUsers.execute({ login: "x" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Invalid OAuth token"), true, err.message);
  assertEquals(err.message.includes("Client-Id"), true, err.message);
});
