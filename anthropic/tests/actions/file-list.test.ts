import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-list.ts";

Deno.test("file-list: GETs /v1/files with files-api beta flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], has_more: false } }]);
  await action.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1/files");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(calls[0].headers["anthropic-beta"], "files-api-2025-04-14");
});

Deno.test("file-list: forwards pagination params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 25, after_id: "f_a", before_id: "f_b" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "25");
  assertEquals(params.get("after_id"), "f_a");
  assertEquals(params.get("before_id"), "f_b");
});

Deno.test("file-list: omits pagination params when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("limit"));
});
