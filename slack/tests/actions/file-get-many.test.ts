import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get-many.ts";

Deno.test("file-get-many: GETs /files.list with count default and forwarded filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, files: [] } }]);
  await action.execute!({ channel: "C1", user: "U1", types: "images", page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/files.list");
  assertEquals(url.searchParams.get("channel"), "C1");
  assertEquals(url.searchParams.get("user"), "U1");
  assertEquals(url.searchParams.get("types"), "images");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("count"), "100");
});
