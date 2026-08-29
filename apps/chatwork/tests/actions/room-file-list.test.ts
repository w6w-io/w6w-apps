import { assertEquals } from "@std/assert";
import roomFileList from "../../actions/room-file-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-file-list: passes accountId through as a query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await roomFileList.execute({ roomId: "5", accountId: 101 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/files");
  assertEquals(queryOf(calls[0].url), { account_id: "101" });
});

Deno.test("room-file-list: a 204 (no files) normalises to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await roomFileList.execute({ roomId: "5" }, ctx);
  assertEquals(out, []);
});
