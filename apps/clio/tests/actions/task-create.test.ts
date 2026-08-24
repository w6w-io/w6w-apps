import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { envelope, mockCtx } from "../_helpers.ts";

/**
 * `assignee.type` is capitalized ("User"/"Contact") in the create body, unlike
 * the lowercase `assignee_type` the LIST endpoint's own filter takes.
 */
Deno.test("task-create: POSTs with a capitalized assignee.type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await taskCreate.execute(
    { name: "Follow up", description: "Call the client", assigneeId: 5, assigneeType: "User" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      name: "Follow up",
      description: "Call the client",
      assignee: { id: 5, type: "User" },
    },
  });
});

Deno.test("task-create: an optional matter ref is only sent when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await taskCreate.execute(
    { name: "n", description: "d", assigneeId: 1, assigneeType: "Contact", matterId: 8 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).data.matter, { id: 8 });
});
