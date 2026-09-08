import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-task.ts";

Deno.test("update-task: PUTs /tasks/{id} with provided fields only", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", name: "n2", completed: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { data: { name: "n2", completed: true } });
});

Deno.test("update-task: omits id from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "t-1", notes: "hi" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("id" in sent.data));
});

Deno.test("update-task: forwards custom_fields/followers/html_notes/start_on/due_at verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({
    id: "t-1",
    custom_fields: { "1231": "some value" },
    followers: ["u-1", "u-2"],
    html_notes: "<body>hi</body>",
    start_on: "2026-07-01",
    due_at: "2026-07-02T10:00:00.000Z",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(
    Object.keys(sent.data).sort(),
    ["custom_fields", "due_at", "followers", "html_notes", "start_on"],
  );
  assertEquals(sent.data.custom_fields, { "1231": "some value" });
  assertEquals(sent.data.followers, ["u-1", "u-2"]);
  assertEquals(sent.data.html_notes, "<body>hi</body>");
  assertEquals(sent.data.start_on, "2026-07-01");
  assertEquals(sent.data.due_at, "2026-07-02T10:00:00.000Z");
});
