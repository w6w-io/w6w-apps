import { assertEquals } from "@std/assert";
import broadcastList from "../../actions/broadcast-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("broadcast-list: hits GET /broadcasts with order/sort and pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 2,
        broadcasts: [{ id: 1 }, { id: 2 }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await broadcastList.execute({ order: "date", sort: "asc", page: 2 }, ctx) as {
    broadcasts: unknown[];
    totalCount: number;
  };
  assertEquals(pathOf(calls[0].url), "/api/v2/broadcasts");
  const q = queryOf(calls[0].url);
  assertEquals(q.order, "date");
  assertEquals(q.sort, "asc");
  assertEquals(q.page, "2");
  assertEquals(out.broadcasts.length, 2);
  assertEquals(out.totalCount, 2);
});
