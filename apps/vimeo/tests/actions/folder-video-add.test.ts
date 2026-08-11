import { assertEquals, assertRejects } from "@std/assert";
import folderVideoAdd from "../../actions/folder-video-add.ts";
import { jsonBody, mockCtx, url } from "../_helpers.ts";

/**
 * One video goes through the single-video endpoint Vimeo documents for the
 * case, which needs no body at all.
 */
Deno.test("folder-video-add: one video uses the path endpoint with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await folderVideoAdd.execute({ folderId: "12345", videoIds: "258684937" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos/258684937");
  assertEquals(calls[0].body, null);
  assertEquals(out, { added: true, folderId: "12345", videoIds: ["258684937"] });
});

/**
 * The bulk endpoint takes full URIs as ONE comma-separated string. Bare ids and
 * an array are both rejected.
 */
Deno.test("folder-video-add: several videos use the bulk endpoint with a uris string", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await folderVideoAdd.execute(
    { folderId: "12345", videoIds: "258684937, /videos/273576296" },
    ctx,
  );
  assertEquals(calls.length, 1, "the bulk case must be one request, not a loop");
  assertEquals(url(calls[0]).pathname, "/me/projects/12345/videos");
  assertEquals(jsonBody(calls[0]), { uris: "/videos/258684937,/videos/273576296" });
  assertEquals(out.videoIds, ["258684937", "273576296"]);
});

Deno.test("folder-video-add: a blank video list is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await folderVideoAdd.execute({ folderId: "1", videoIds: " , " }, ctx),
    Error,
    "Video IDs is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("folder-video-add: is a convergent perform", () => {
  assertEquals(folderVideoAdd.type, "perform");
  assertEquals(folderVideoAdd.idempotent, true);
});
