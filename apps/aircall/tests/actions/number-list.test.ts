import { assertEquals } from "@std/assert";
import numberList from "../../actions/number-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("number-list: reads GET /v1/numbers", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody("numbers", [{ id: 1234, name: "French Office" }]) },
  ]);
  const out = await numberList.execute({}, ctx) as { items: Array<{ name: string }> };

  assertEquals(pathOf(calls[0].url), "/v1/numbers");
  assertEquals(out.items[0].name, "French Office");
});

Deno.test("number-list: window and pagination reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("numbers", []) }]);
  await numberList.execute({ from: "1", order: "asc", perPage: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), { from: "1", order: "asc", per_page: "5" });
});
