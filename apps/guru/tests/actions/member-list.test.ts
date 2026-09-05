import { assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { linkHeader, mockCtx, pathOf, queryOf } from "../_helpers.ts";

type ListResult = { items: unknown[]; nextToken?: string };

Deno.test("member-list: lists members and strips each TeamUser's token", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [{ id: "u1", token: "live-collection-token", user: { firstName: "Ada" } }],
      headers: { link: linkHeader("page2", "/members") },
    },
  ]);
  const result = await memberList.execute({ search: "Ada" }, ctx) as ListResult;

  assertEquals(pathOf(calls[0].url), "/api/v1/members");
  assertEquals(queryOf(calls[0].url), { search: "Ada" });
  assertEquals(result.items, [{ id: "u1", user: { firstName: "Ada" } }]);
  assertEquals(result.nextToken, "page2");
});
