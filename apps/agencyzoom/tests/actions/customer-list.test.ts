import { assertEquals } from "@std/assert";
import customerList from "../../actions/customer-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("customer-list: POSTs filters to /customers", async () => {
  const { ctx, calls } = mockCtx([
    { body: { totalCount: 1, page: 0, pageSize: 100, customers: [{ id: 1 }] } },
  ]);
  await customerList.execute({ email: "a@b.com", status: 1 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/customers");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com", status: 1 });
});

/** `status: -1` ("all") must survive compact() the same way `status: 0` does. */
Deno.test("customer-list: status -1 (all) survives compact()", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customerList.execute({ status: -1 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).status, -1);
});
