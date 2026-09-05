import { assert, assertEquals, assertRejects } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("profile-get: GETs /v2/bot/profile/{userId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { displayName: "LINE taro", userId: "U4af4980629...", statusMessage: "Hello!" } },
  ]);
  const out = await profileGet.execute({ userId: "U4af4980629..." }, ctx) as {
    displayName: string;
  };

  assertEquals(pathOf(calls[0].url), "/v2/bot/profile/U4af4980629...");
  assertEquals(out.displayName, "LINE taro");
});

Deno.test("profile-get: URL-encodes the user id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await profileGet.execute({ userId: "weird/id?x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/bot/profile/weird%2Fid%3Fx");
});

Deno.test("profile-get: requires userId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await profileGet.execute({ userId: "" }, ctx), Error, "userId");
  assertEquals(calls.length, 0);
});

Deno.test("profile-get: is a read action with no side effects declared", () => {
  assertEquals(profileGet.type, "read");
  assert(Array.isArray(profileGet.output) && profileGet.output.length > 0);
});
