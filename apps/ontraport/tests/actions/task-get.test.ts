import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-get: calls GET /1/Task?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", subject: "Do this." }) }]);
  const out = await taskGet.execute({ id: "1" }, ctx) as { subject: string };

  assertEquals(pathOf(calls[0].url), "/1/Task");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.subject, "Do this.");
});
