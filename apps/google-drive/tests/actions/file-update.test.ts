import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-update.ts";

Deno.test("file-update: PATCHes metadata only when no content is supplied", async () => {
  const body = { id: "f-1", name: "Renamed" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ fileId: "f-1", name: "Renamed", starred: true }, ctx);

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/drive/v3/files/f-1");
  assertEquals(url.searchParams.get("fields"), "*");

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.name, "Renamed");
  assertEquals(sent.starred, true);
  assertEquals(result, body);
});
