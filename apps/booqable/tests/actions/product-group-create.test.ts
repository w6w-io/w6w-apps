import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/product-group-create.ts";

Deno.test("product-group-create: POSTs a JSON:API document to /product_groups", async () => {
  const { ctx, calls } = mockBooqableCtx([{ status: 201, body: { data: { id: "pg1" } } }]);
  await action.execute({
    name: "iPad mini",
    productType: "rental",
    trackingType: "trackable",
    priceType: "simple",
    pricePeriod: "day",
    tagList: "tablets, apple",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/product_groups");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.type, "product_groups");
  assertEquals(body.data.attributes.name, "iPad mini");
  assertEquals(body.data.attributes.tracking_type, "trackable");
  assertEquals(body.data.attributes.tag_list, ["tablets", "apple"]);
});
