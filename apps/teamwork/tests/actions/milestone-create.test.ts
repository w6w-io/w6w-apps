import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/milestone-create.ts";

Deno.test("milestone-create: POSTs the V1 /projects/{id}/milestones.json endpoint", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: { STATUS: "OK" } }]);
  await action.execute({ projectId: 42, title: "Beta", deadline: "2026-12-25" }, ctx);
  assertEquals(calls[0].url, "https://acme.teamwork.com/projects/42/milestones.json");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { milestone: { title: "Beta", deadline: "20261225" } });
});

Deno.test("milestone-create: joins responsible party ids into a comma string", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ status: 201, body: {} }]);
  await action.execute({
    projectId: 42,
    title: "Beta",
    deadline: "2026-12-25",
    responsiblePartyIds: "1, 2",
  }, ctx);
  const body = JSON.parse(calls[0].body!).milestone;
  assertEquals(body["responsible-party-ids"], "1,2");
});
