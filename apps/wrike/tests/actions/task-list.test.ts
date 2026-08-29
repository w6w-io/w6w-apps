import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GETs /tasks with filters and a prefilled small pageSize", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "1" }]) }]);
  const out = await taskList.execute(
    { title: "Ship", status: ["Active", "Deferred"], pageSize: 100 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks");
  assertEquals(queryOf(calls[0].url), {
    title: "Ship",
    status: '["Active","Deferred"]',
    pageSize: "100",
  });
  assertEquals(out.items, [{ id: "1" }]);
});

Deno.test("task-list: accepts a comma-separated string for a multiselect-shaped filter", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([]) }]);
  await taskList.execute({ status: "Active,Completed" }, ctx);
  assertEquals(queryOf(calls[0].url).status, '["Active","Completed"]');
});

Deno.test("task-list: pageSize defaults to a modest 100, not Wrike's own unbounded default", () => {
  const p = taskList.params?.find((p) => p.key === "pageSize");
  assertEquals(p?.default, 100);
});

Deno.test("task-list: rawParams merges into the query and can add fields not modeled directly", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([]) }]);
  await taskList.execute({ rawParams: { customFields: [{ id: "IEAAAAAA", value: "x" }] } }, ctx);
  assertEquals(queryOf(calls[0].url).customFields, '[{"id":"IEAAAAAA","value":"x"}]');
});
