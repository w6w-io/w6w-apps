import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deals-list.ts";

Deno.test("deals-list: POSTs deals.list, nests customer under filter, returns items and matches", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "d1" }], meta: { matches: 1 } },
  }]);
  const out = await action.execute({
    customerType: "company",
    customerId: "co-1",
    status: ["open"],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/deals.list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.filter.customer, { type: "company", id: "co-1" });
  assertEquals(body.filter.status, ["open"]);
  assertEquals(out, { items: [{ id: "d1" }], matches: 1 });
});

Deno.test("deals-list: omits customer entirely when only one of the pair is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ customerType: "company" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("customer" in (body.filter ?? {}), false);
});
