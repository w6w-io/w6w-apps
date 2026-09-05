import { assertEquals, assertThrows } from "@std/assert";
import userFollow from "../../actions/user-follow.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-follow: POSTs the url to /v2/user/follow", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ blog: { name: "david" } }) }]);
  await userFollow.execute({ url: "https://david.tumblr.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/follow");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://david.tumblr.com" });
});

Deno.test("user-follow: requires url or email", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => userFollow.execute({}, ctx), Error, "Provide either url or email");
});
