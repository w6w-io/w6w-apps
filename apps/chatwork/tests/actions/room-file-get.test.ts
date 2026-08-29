import { assertEquals } from "@std/assert";
import roomFileGet from "../../actions/room-file-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("room-file-get: create_download_url off by default (matches the vendor default)", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_id: 8, filename: "a.txt" } }]);
  await roomFileGet.execute({ roomId: "5", fileId: 8 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/files/8");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("room-file-get: create_download_url true sends 1", async () => {
  const { ctx, calls } = mockCtx([{ body: { file_id: 8, download_url: "https://x" } }]);
  const out = await roomFileGet.execute({ roomId: "5", fileId: 8, createDownloadUrl: true }, ctx);
  assertEquals(queryOf(calls[0].url), { create_download_url: "1" });
  assertEquals(out, { file_id: 8, download_url: "https://x" });
});
