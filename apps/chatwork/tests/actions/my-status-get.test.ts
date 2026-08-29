import { assertEquals } from "@std/assert";
import myStatusGet from "../../actions/my-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("my-status-get: calls GET /my/status", async () => {
  const status = {
    unread_room_num: 2,
    mention_room_num: 1,
    mytask_room_num: 3,
    unread_num: 5,
    mention_num: 1,
    mytask_num: 4,
  };
  const { ctx, calls } = mockCtx([{ body: status }]);
  const out = await myStatusGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/my/status");
  assertEquals(out, status);
});
