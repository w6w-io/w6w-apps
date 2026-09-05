import { assertEquals, assertRejects } from "@std/assert";
import productList from "../../actions/product-list.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: 1, name: "A" }]) }]);
  const out = await productList.execute({
    id: 698441,
    status: "ACTIVE",
    format: "ONLINE_COURSE",
    maxResults: 50,
    pageToken: "tok",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/products/api/v1/products");
  assertEquals(queryOf(calls[0].url), {
    id: "698441",
    status: "ACTIVE",
    format: "ONLINE_COURSE",
    max_results: "50",
    page_token: "tok",
  });
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("product-list - surfaces invalid_parameter", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid_parameter", "bad param") }]);
  await assertRejects(
    () => Promise.resolve(productList.execute({}, ctx)),
    Error,
    "invalid_parameter",
  );
});
