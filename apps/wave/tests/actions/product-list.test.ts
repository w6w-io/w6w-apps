import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import productList from "../../actions/product-list.ts";

Deno.test("product-list: returns the products connection", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        business: {
          products: {
            pageInfo: { currentPage: 1, totalPages: 1, totalCount: 1 },
            edges: [{ node: { id: "p1", name: "LED Bulb", unitPrice: "2.0625" } }],
          },
        },
      },
    },
  }]);
  const out = await productList.execute({ businessId: "b1", isSold: true }, ctx) as {
    edges: unknown[];
  };
  assertEquals(out.edges.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.isSold, true);
});

Deno.test("product-list: an explicit `false` filter survives compact()", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { business: { products: { edges: [], pageInfo: {} } } } },
  }]);
  await productList.execute({ businessId: "b1", isArchived: false }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.isArchived, false);
});

Deno.test("product-list: type/resource metadata", () => {
  assertEquals(productList.type, "search");
  assertEquals(productList.resource, "product");
});
