import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import invoiceList from "../../actions/invoice-list.ts";

Deno.test("invoice-list: returns the invoices connection", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        business: {
          invoices: {
            pageInfo: { currentPage: 1, totalPages: 1, totalCount: 1 },
            edges: [{ node: { id: "i1", invoiceNumber: "INV-001", status: "SENT" } }],
          },
        },
      },
    },
  }]);
  const out = await invoiceList.execute({ businessId: "b1", status: "SENT" }, ctx) as {
    edges: unknown[];
  };
  assertEquals(out.edges.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.status, "SENT");
});

Deno.test("invoice-list: filters by customerId", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { invoices: { edges: [], pageInfo: {} } } } },
  }]);
  await invoiceList.execute({ businessId: "b1", customerId: "c1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.customerId, "c1");
});

Deno.test("invoice-list: type/resource metadata", () => {
  assertEquals(invoiceList.type, "search");
  assertEquals(invoiceList.resource, "invoice");
});
