import { assertEquals } from "@std/assert";
import folderDelete from "../../actions/folder-delete.ts";
import { jsonBody, mockCtx, url } from "../_helpers.ts";

Deno.test("folder-delete: DELETEs /me/projects/{id} with no body by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await folderDelete.execute({ folderId: "/users/152184/projects/12345" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/me/projects/12345");
  // No body at all: the videos inside stay in the account.
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, folderId: "12345" });
});

Deno.test("folder-delete: the destructive flag is only sent when asked for", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await folderDelete.execute({ folderId: "1", shouldDeleteClips: true }, ctx);
  assertEquals(jsonBody(calls[0]), { should_delete_clips: true });

  await folderDelete.execute({ folderId: "1", shouldDeleteClips: false }, ctx);
  assertEquals(jsonBody(calls[1]), { should_delete_clips: false });
});

/**
 * Vimeo defines `send_to_recently_deleted` only "when true AND
 * should_delete_clips is true". Sending it alone would make the request look
 * like it did something it did not.
 */
Deno.test("folder-delete: recently-deleted is never sent without the delete flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 204 }]);
  await folderDelete.execute({ folderId: "1", sendToRecentlyDeleted: true }, ctx);
  assertEquals(calls[0].body, null);

  await folderDelete.execute(
    { folderId: "1", shouldDeleteClips: true, sendToRecentlyDeleted: true },
    ctx,
  );
  assertEquals(jsonBody(calls[1]), { should_delete_clips: true, send_to_recently_deleted: true });
});

Deno.test("folder-delete: is a retry-safe perform", () => {
  assertEquals(folderDelete.type, "perform");
  assertEquals(folderDelete.idempotent, true);
});
