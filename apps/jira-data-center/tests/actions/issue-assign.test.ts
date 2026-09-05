import { assertEquals } from "@std/assert";
import issueAssign from "../../actions/issue-assign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issue-assign: PUTs the username, not an accountId", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueAssign.execute({ issueKey: "ENG-1", username: "jdoe" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/assignee");
  assertEquals(JSON.parse(calls[0].body!), { name: "jdoe" });
});

Deno.test("issue-assign: an empty username unassigns with an explicit null", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await issueAssign.execute({ issueKey: "ENG-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: null });
});
