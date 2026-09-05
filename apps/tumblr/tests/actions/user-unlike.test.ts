import { assertEquals } from "@std/assert";
import userUnlike from "../../actions/user-unlike.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-unlike: POSTs id + reblog_key to /v2/user/unlike", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  const out = await userUnlike.execute({ id: 123, reblogKey: "rk" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/unlike");
  assertEquals(JSON.parse(calls[0].body!), { id: 123, reblog_key: "rk" });
  assertEquals(out, { status: 200 });
});
