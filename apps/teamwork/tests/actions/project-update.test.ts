import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/project-update.ts";

Deno.test("project-update: PUTs the V1 /projects/{id}.json endpoint", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { STATUS: "OK" } }]);
  await action.execute({ projectId: 42, status: "inactive" }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/42.json");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { project: { status: "inactive" } });
});

Deno.test("project-update: only touches fields that were set", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { STATUS: "OK" } }]);
  await action.execute({ projectId: 42, name: "New name" }, ctx);
  const body = JSON.parse(calls[0].body!).project;
  assertEquals(body.name, "New name");
  assertEquals("description" in body, false);
  assertEquals("status" in body, false);
});
