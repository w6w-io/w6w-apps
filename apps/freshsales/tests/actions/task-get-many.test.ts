import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/task-get-many.ts";

Deno.test("task-get-many: GETs /tasks with the mandatory filter param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { tasks: [{ id: 1 }], meta: { total: 1 } } }]);
  const out = await action.execute({ filter: "open" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/tasks?filter=open");
  assertEquals(out, { tasks: [{ id: 1 }], total: 1 });
});

Deno.test("task-get-many: joins include into a comma-separated query param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { tasks: [], meta: { total: 0 } } }]);
  await action.execute({ filter: "open", include: ["owner", "targetable"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "owner,targetable");
});
