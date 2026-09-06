import { assertEquals } from "@std/assert";
import action from "../../actions/list-employee-attributes.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-employee-attributes: fetches the attribute schema unmodified", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: [
          {
            key: "first_name",
            label: "First Name",
            type: "standard",
            universal_id: "first_name",
            options: [],
          },
          {
            key: "dynamic_2",
            label: "Marital status",
            type: "list",
            universal_id: null,
            options: ["married", "single"],
          },
        ],
      },
    },
  ]);
  const out = await action.execute({}, ctx) as { attributes: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/company/employees/attributes");
  assertEquals(out.attributes.length, 2);
  assertEquals((out.attributes[1] as { key: string }).key, "dynamic_2");
});
