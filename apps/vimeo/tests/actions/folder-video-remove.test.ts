import { assertEquals, assertRejects } from "@std/assert";
import folderVideoRemove from "../../actions/folder-video-remove.ts";
import { jsonBody, mockCtx, url } from "../_helpers.ts";

Deno.test("folder-video-remove: one video uses the path endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await folderVideoRemove.execute({ folderId: "12345", videoIds: "1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos/1");
  assertEquals(out.deletedVideos, false);
});

Deno.test("folder-video-remove: several videos use the bulk endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await folderVideoRemove.execute({ folderId: "12345", videoIds: "1,2" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos");
  assertEquals(jsonBody(calls[0]).uris, "/videos/1,/videos/2");
});

/**
 * The load-bearing case. Only the BULK endpoint accepts `should_delete_clips` —
 * the single-video one "doesn't delete the video itself" — so a request that
 * says to delete must not be routed to the endpoint that would silently drop
 * the flag and leave the videos alive.
 */
Deno.test("folder-video-remove: deleting one video still uses the bulk endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await folderVideoRemove.execute(
    { folderId: "12345", videoIds: "1", shouldDeleteClips: true },
    ctx,
  );
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos");
  assertEquals(jsonBody(calls[0]), { uris: "/videos/1", should_delete_clips: true });
  assertEquals(out.deletedVideos, true);
});

Deno.test("folder-video-remove: recently-deleted is never sent without the delete flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await folderVideoRemove.execute(
    { folderId: "1", videoIds: "1,2", sendToRecentlyDeleted: true },
    ctx,
  );
  assertEquals(jsonBody(calls[0]).send_to_recently_deleted, undefined);

  await folderVideoRemove.execute(
    { folderId: "1", videoIds: "1,2", shouldDeleteClips: true, sendToRecentlyDeleted: true },
    ctx,
  );
  assertEquals(jsonBody(calls[1]).send_to_recently_deleted, true);
});

Deno.test("folder-video-remove: a blank video list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await folderVideoRemove.execute({ folderId: "1", videoIds: "" }, ctx),
    Error,
    "Video IDs is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("folder-video-remove: is a retry-safe perform", () => {
  assertEquals(folderVideoRemove.type, "perform");
  assertEquals(folderVideoRemove.idempotent, true);
});
