import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-list.ts";

Deno.test("shipment-list: sends filters as query params", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { shipments: [], total: 0, page: 1, pages: 0 } },
  ]);
  await action.execute!(
    { shipmentStatus: "pending", tag: "east_warehouse", page: 2, pageSize: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/shipments");
  assertEquals(url.searchParams.get("shipment_status"), "pending");
  assertEquals(url.searchParams.get("tag"), "east_warehouse");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "10");
});

Deno.test("shipment-list: omits unset filters rather than sending empty strings", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { shipments: [], total: 0, page: 1, pages: 0 } },
  ]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("shipment_status"), false);
  assertEquals(url.searchParams.has("batch_id"), false);
});

Deno.test("shipment-list: returns pagination fields alongside the results", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { shipments: [{ shipment_id: "se-1" }], total: 5, page: 1, pages: 3 } },
  ]);
  const result = await action.execute!({}, ctx) as {
    shipments: unknown[];
    total: number;
    pages: number;
  };
  assertEquals(result.shipments.length, 1);
  assertEquals(result.total, 5);
  assertEquals(result.pages, 3);
});
