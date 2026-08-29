import { assertEquals } from "@std/assert";
import officesList from "../../actions/offices-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offices-list: GETs /offices with the active-only filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ id: "1" }]) }]);
  await officesList.execute({ activeOnly: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/offices");
  assertEquals(queryOf(calls[0].url), { active_only: "true" });
});
