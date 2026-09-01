import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs to /tasks, wrapped and unwrapped under `task`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { task: { id: 1, title: "Follow up" } } }]);
  const out = await action.execute({ title: "Follow up" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { task: { title: "Follow up" } });
  assertEquals(out, { id: 1, title: "Follow up" });
});

Deno.test("task-create: optionally attaches to a targetable record", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { task: {} } }]);
  await action.execute(
    { title: "Follow up", targetableType: "Deal", targetableId: 2, ownerId: 1 },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!),
    { task: { title: "Follow up", targetable_type: "Deal", targetable_id: 2, owner_id: 1 } },
  );
});
