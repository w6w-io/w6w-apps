import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor's own required body field is named `key` and means "box key" —
 * duplicating the boxKey path segment. This action hides that from the
 * caller: the input only takes `boxKey` once, and this test pins that the
 * duplication still reaches the wire the way Streak requires.
 */
Deno.test("task-create: sends boxKey both in the path and as the body's 'key'", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "task1", boxKey: "b1", text: "Do it" } }]);
  await taskCreate.execute({ boxKey: "b1", text: "Do it" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/boxes/b1/tasks");
  const body = JSON.parse(calls[0].body!) as { key: string; text: string };
  assertEquals(body.key, "b1");
  assertEquals(body.text, "Do it");
});

Deno.test("task-create: assignedToEmails becomes an array of {email} objects", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "task1" } }]);
  await taskCreate.execute(
    { boxKey: "b1", text: "Do it", assignedToEmails: ["a@x.com"] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!) as { assignedToSharingEntries: unknown };
  assertEquals(body.assignedToSharingEntries, [{ email: "a@x.com" }]);
});
