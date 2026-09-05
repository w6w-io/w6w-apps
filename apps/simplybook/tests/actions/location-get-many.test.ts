import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/location-get-many.ts";

Deno.test("location-get-many: GETs /admin/locations", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Downtown" }] }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/locations");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, [{ id: 1, name: "Downtown" }]);
});
