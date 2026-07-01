import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/archive-page.ts";

Deno.test("archive-page: PATCHes /pages/{id} with archived=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-1", archived: true } }]);
  await action.execute({ pageId: "page-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page-1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { archived: true });
});
