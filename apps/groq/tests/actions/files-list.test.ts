import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/files-list.ts";

Deno.test("files-list: GETs /openai/v1/files", async () => {
  const body = { object: "list", data: [{ id: "file-1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/files");
  assertEquals(result, body);
});
