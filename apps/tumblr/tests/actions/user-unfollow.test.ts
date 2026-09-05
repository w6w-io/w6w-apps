import { assertEquals } from "@std/assert";
import userUnfollow from "../../actions/user-unfollow.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-unfollow: POSTs the url to /v2/user/unfollow", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await userUnfollow.execute({ url: "https://david.tumblr.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/unfollow");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://david.tumblr.com" });
  assertEquals(out, { status: 200 });
});
