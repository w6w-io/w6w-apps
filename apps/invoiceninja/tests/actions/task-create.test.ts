import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs /tasks with the description", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "t1" } }]);
  await action.execute({ description: "Design homepage", clientId: "cl1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.description, "Design homepage");
  assertEquals(body.client_id, "cl1");
});
