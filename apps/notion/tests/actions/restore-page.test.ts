import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/restore-page.ts";

Deno.test("restore-page: PATCHes /pages/{id} with archived=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1", archived: false } }]);
  await action.execute({ pageId: "page-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { archived: false });
});
