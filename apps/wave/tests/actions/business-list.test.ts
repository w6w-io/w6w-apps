import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import businessList from "../../actions/business-list.ts";

Deno.test("business-list: returns the businesses connection", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        businesses: {
          pageInfo: { currentPage: 1, totalPages: 1, totalCount: 2 },
          edges: [
            { node: { id: "b1", name: "Personal", isPersonal: true } },
            { node: { id: "b2", name: "Smith Consulting", isPersonal: false } },
          ],
        },
      },
    },
  }]);
  const out = await businessList.execute({ page: 1, pageSize: 10 }, ctx) as {
    edges: unknown[];
    pageInfo: { totalCount: number };
  };
  assertEquals(out.edges.length, 2);
  assertEquals(out.pageInfo.totalCount, 2);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.page, 1);
  assertEquals(body.variables.pageSize, 10);
});

Deno.test("business-list: type/resource metadata", () => {
  assertEquals(businessList.type, "search");
  assertEquals(businessList.resource, "business");
});
