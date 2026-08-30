import { assertEquals } from "@std/assert";
import domainPageList from "../../actions/domain-page-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("domain-page-list: calls GET /domains/{id}/pages", async () => {
  const { ctx, calls } = mockCtx([{ body: { pages: [] } }]);
  await domainPageList.execute({ domainId: "1225953" }, ctx);
  assertEquals(pathOf(calls[0].url), "/domains/1225953/pages");
});
