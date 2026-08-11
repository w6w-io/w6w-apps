import { assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-list: reads GET /v1/teams", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody("teams", [{ id: 678, name: "Global Sales" }]) },
  ]);
  const out = await teamList.execute({}, ctx) as { items: Array<{ name: string }> };

  assertEquals(pathOf(calls[0].url), "/v1/teams");
  assertEquals(out.items[0].name, "Global Sales");
});

/** Teams take `order` but no from/to window, unlike the other list endpoints. */
Deno.test("team-list: sends order and pagination but no creation window", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("teams", []) }]);
  await teamList.execute({ order: "desc", page: 2, perPage: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { order: "desc", page: "2", per_page: "10" });
});
