import { assertEquals, assertRejects } from "@std/assert";
import bookmarksAdd from "../../actions/bookmarks-add.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bookmarks-add: sends url/title and the documented defaults", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "bookmark", bookmark_id: 1, url: "https://example.com/a" }]),
  }]);
  const result = await bookmarksAdd.execute({ url: "https://example.com/a", title: "A" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/bookmarks/add");
  assertEquals(bodyOf(calls[0]), {
    url: "https://example.com/a",
    title: "A",
    resolve_final_url: "1",
    archived: "0",
  });
  assertEquals(result, { type: "bookmark", bookmark_id: 1, url: "https://example.com/a" });
});

Deno.test("bookmarks-add: resolveFinalUrl:false and archived:true flip the documented flags", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 1 }]) }]);
  await bookmarksAdd.execute(
    { url: "https://example.com/a", resolveFinalUrl: false, archived: true },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).resolve_final_url, "0");
  assertEquals(bodyOf(calls[0]).archived, "1");
});

Deno.test("bookmarks-add: tags are serialized to Instapaper's [{name: ...}] wire format", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 1 }]) }]);
  await bookmarksAdd.execute({ url: "https://example.com/a", tags: ["reading", "later"] }, ctx);
  assertEquals(
    bodyOf(calls[0]).tags,
    JSON.stringify([{ name: "reading" }, { name: "later" }]),
  );
});

Deno.test("bookmarks-add: an empty tags list sends no tags field at all", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 1 }]) }]);
  await bookmarksAdd.execute({ url: "https://example.com/a", tags: [] }, ctx);
  assertEquals("tags" in bodyOf(calls[0]), false);
});

Deno.test("bookmarks-add: content and isPrivateFromSource pass through for the documented private-bookmark case", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "bookmark", bookmark_id: 1 }]) }]);
  await bookmarksAdd.execute(
    { content: "<p>hi</p>", isPrivateFromSource: "email" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).content, "<p>hi</p>");
  assertEquals(bodyOf(calls[0]).is_private_from_source, "email");
});

Deno.test("bookmarks-add: throws if Instapaper returns no bookmark", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  await assertRejects(
    async () => await bookmarksAdd.execute({ url: "https://example.com/a" }, ctx),
    Error,
    "no bookmark",
  );
});

Deno.test("bookmarks-add: is not marked idempotent — a repeat call re-tops an existing bookmark", () => {
  assertEquals(bookmarksAdd.idempotent, false);
});
