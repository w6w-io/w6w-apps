import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-project.ts";

Deno.test("update-project: PUTs /projects/{id} with provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "p-1", name: "new", color: "dark-blue" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/projects/p-1");
  assertEquals(JSON.parse(calls[0].body!), { data: { name: "new", color: "dark-blue" } });
});

Deno.test("update-project: omits id from the body and skips undefined fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ id: "p-1", notes: "hi" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(!("id" in sent.data));
  assertEquals(sent.data, { notes: "hi" });
});
