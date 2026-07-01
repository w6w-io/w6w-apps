import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/star-delete.ts";

Deno.test("star-delete: POSTs /stars.remove with only the supplied identifiers", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ fileId: "F1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/stars.remove");
  assertEquals(JSON.parse(calls[0].body!), { file: "F1" });
});
