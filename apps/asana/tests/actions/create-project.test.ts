import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-project.ts";

Deno.test("create-project: without team POSTs /projects with workspace in body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { gid: "p-1" } } }]);
  await action.execute({ workspace: "ws-1", name: "Proj" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/projects");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { data: { name: "Proj", workspace: "ws-1" } });
});

Deno.test("create-project: with team POSTs /teams/{team}/projects", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ workspace: "ws-1", name: "Proj", team: "team-9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/teams/team-9/projects");
  const sent = JSON.parse(calls[0].body!);
  // team is used to route, not sent in body
  assert(!("team" in sent.data));
});

Deno.test("create-project: forwards color / due_on / notes / privacy_setting", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({
    workspace: "ws-1",
    name: "Proj",
    color: "dark-blue",
    due_on: "2024-12-31",
    notes: "nn",
    privacy_setting: "public_to_workspace",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.color, "dark-blue");
  assertEquals(sent.data.due_on, "2024-12-31");
  assertEquals(sent.data.notes, "nn");
  assertEquals(sent.data.privacy_setting, "public_to_workspace");
});
