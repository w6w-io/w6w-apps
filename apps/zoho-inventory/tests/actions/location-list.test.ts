import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/location-list.ts";

/**
 * Warehouses — the Inventory-specific resource Zoho Books has no equivalent
 * of. Stock is tracked per location, so this is where a "how many are there"
 * question gets its second half.
 */
Deno.test("location-list: GETs /locations with organization_id and unwraps `locations`", async () => {
  const { ctx, calls } = mockInventoryCtx([
    {
      body: {
        code: 0,
        message: "success",
        locations: [{ location_id: "1", location_name: "Main Warehouse" }],
        page_context: { page: 1, per_page: 200, has_more_page: false },
      },
    },
  ]);
  const out = await action.execute({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/locations");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.data, [{ location_id: "1", location_name: "Main Warehouse" }]);
  assertEquals(out.pageContext, { page: 1, per_page: 200, has_more_page: false });
});

Deno.test("location-list: read-only — no create, update or delete param surface", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.every((p) => !p.required), true);
});
