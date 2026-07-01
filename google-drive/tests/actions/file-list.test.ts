import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-list.ts";

Deno.test("file-list: GETs /files with q + defaults", async () => {
  const body = { files: [{ id: "f-1" }], nextPageToken: "tok" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { q: "name contains 'foo'" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/drive/v3/files");
  // Excluding trashed by default.
  assertEquals(url.searchParams.get("q"), "name contains 'foo' and trashed = false");
  assertEquals(url.searchParams.get("pageSize"), "100");
  assertEquals(url.searchParams.get("corpora"), "user");
  assertEquals(result, body);
});
