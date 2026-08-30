import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs the V1 /projects.json endpoint, wrapped in `project`", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: { id: "1", STATUS: "Created" } }]);
  await action.execute({ name: "Launch" }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { project: { name: "Launch" } });
});

Deno.test("project-create: compacts YYYY-MM-DD dates to Teamwork's YYYYMMDD wire format", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: {} }]);
  await action.execute({ name: "Launch", startDate: "2026-09-01", endDate: "2026-09-30" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.project["start-date"], "20260901");
  assertEquals(body.project["end-date"], "20260930");
});
