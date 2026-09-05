import { assertEquals } from "@std/assert";
import userLike from "../../actions/user-like.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-like: POSTs id + reblog_key to /v2/user/like", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await userLike.execute({ id: 123, reblogKey: "rk" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/like");
  assertEquals(JSON.parse(calls[0].body!), { id: 123, reblog_key: "rk" });
  assertEquals(out, { status: 200 });
});
