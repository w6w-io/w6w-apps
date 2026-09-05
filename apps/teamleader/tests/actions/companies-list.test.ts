import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-list.ts";

Deno.test("companies-list: POSTs companies.list with filter + page, returns items and matches", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "1" }], meta: { matches: 5 } },
  }]);
  const out = await action.execute({ vatNumber: "BE0899623035", pageNumber: 2 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/companies.list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter, { vat_number: "BE0899623035" });
  assertEquals(body.page, { size: 20, number: 2 });
  assertEquals(out, { items: [{ id: "1" }], matches: 5 });
});
