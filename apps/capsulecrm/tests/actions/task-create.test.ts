import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs /tasks with description, dueOn and a linked party", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { task: { id: 530 } } }]);
  const out = await action.execute(
    { description: "Email product details", dueOn: "2014-05-20", partyId: 11587 },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    task: { description: "Email product details", dueOn: "2014-05-20", party: { id: 11587 } },
  });
  assertEquals(out, { task: { id: 530 } });
});

Deno.test("task-create: description and dueOn are marked required", () => {
  const required = action.params!.filter((p) => p.required).map((p) => p.key);
  assertEquals(required.includes("description"), true);
  assertEquals(required.includes("dueOn"), true);
});
