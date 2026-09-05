import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/provider-get-many.ts";

Deno.test("provider-get-many: GETs /admin/providers", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Alex" }] }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/providers");
  assertEquals(result, [{ id: 1, name: "Alex" }]);
});

Deno.test("provider-get-many: filters by service id", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({ serviceId: 9 }, ctx);
  assertEquals(queryOf(calls[0].url)["filter[service_id]"], "9");
});
