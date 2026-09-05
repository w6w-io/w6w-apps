import { assertEquals } from "@std/assert";
import offerList from "../../actions/offer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("offer-list: joins array filters as comma lists", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { offers: [] } }]);
  await offerList.execute({
    statuses: ["draft", "published"],
    departmentIds: [1, 2],
    tagIds: [3],
    page: 2,
    limit: 25,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/c/123/offers");
  assertEquals(queryOf(calls[0].url), {
    statuses: "draft,published",
    department_ids: "1,2",
    tag_ids: "3",
    page: "2",
    limit: "25",
  });
});
