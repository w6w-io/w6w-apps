import { assertEquals } from "@std/assert";
import issueDelete from "../../actions/issue-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("issue-delete: DELETEs /issue/{key} with deleteSubtasks defaulted to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueDelete.execute({ issueKey: "ENG-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1");
  assertEquals(queryOf(calls[0].url), { deleteSubtasks: "false" });
});

Deno.test("issue-delete: forwards deleteSubtasks=true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueDelete.execute({ issueKey: "ENG-1", deleteSubtasks: true }, ctx);
  assertEquals(queryOf(calls[0].url), { deleteSubtasks: "true" });
});
