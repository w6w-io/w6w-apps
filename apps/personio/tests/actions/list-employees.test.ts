import { assertEquals } from "@std/assert";
import action from "../../actions/list-employees.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

const sampleEmployee = {
  type: "Employee",
  attributes: {
    id: { label: "ID", value: 1, type: "integer", universal_id: "id" },
    first_name: {
      label: "First name",
      value: "Alexander",
      type: "standard",
      universal_id: "first_name",
    },
    supervisor: {
      label: "Supervisor",
      value: {
        type: "Employee",
        attributes: { id: { label: "ID", value: 2, type: "integer", universal_id: "id" } },
      },
      type: "standard",
      universal_id: "supervisor",
    },
  },
};

Deno.test("list-employees: builds the paginated request and flattens wrapped attributes", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        metadata: { total_elements: 1, current_page: 0, total_pages: 1 },
        data: [sampleEmployee],
      },
    },
  ]);

  const out = await action.execute({ limit: 10, offset: 0 }, ctx) as {
    employees: Array<Record<string, unknown>>;
    totalElements: number;
  };

  assertEquals(pathOf(calls[0].url), "/v1/company/employees");
  assertEquals(queryOf(calls[0].url).limit, "10");
  assertEquals(out.employees[0].first_name, "Alexander");
  // Nested Employee relationship is recursively flattened too.
  assertEquals(out.employees[0].supervisor, { type: "Employee", id: 2 });
  assertEquals(out.totalElements, 1);
});

Deno.test("list-employees: repeats attributes[] for each requested attribute", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: [] } }]);
  await action.execute({ attributes: ["first_name", "last_name"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "attributes[]"), ["first_name", "last_name"]);
});

Deno.test("list-employees: passes updatedSince through as updated_since", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true, data: [] } }]);
  await action.execute({ updatedSince: "2026-01-01T00:00:00" }, ctx);
  assertEquals(queryOf(calls[0].url).updated_since, "2026-01-01T00:00:00");
});
