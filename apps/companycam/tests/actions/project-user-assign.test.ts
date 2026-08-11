import { assertEquals } from "@std/assert";
import projectUserAssign from "../../actions/project-user-assign.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-user-assign: PUTs the two ids with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "9" } }]);
  await projectUserAssign.execute({ projectId: "1", userId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/assigned_users/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].body, null);
  assertEquals(projectUserAssign.idempotent, true);
});

Deno.test("project-user-assign: passes the impersonation header through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectUserAssign.execute({ projectId: "1", userId: "9", actAs: "boss@x.com" }, ctx);
  assertEquals(calls[0].headers["x-companycam-user"], "boss@x.com");
});
