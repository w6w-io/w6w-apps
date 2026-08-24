import { assertEquals } from "@std/assert";
import newsletterList from "../../actions/newsletter-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("newsletter-list: hits /api/mailing/newsletters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }]) }]);
  await newsletterList.execute({ order: "asc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/newsletters");
  assertEquals(queryOf(calls[0].url), { order: "asc" });
});
