import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: POSTs /projects with the contact as a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { project: { url: "x" } } }]);
  await action.execute({
    contactId: "2",
    name: "Website redesign",
    currency: "GBP",
    budget: 40,
    budgetUnits: "Hours",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.project.contact, "https://api.freeagent.com/v2/contacts/2");
  assertEquals(body.project.name, "Website redesign");
  assertEquals(body.project.currency, "GBP");
  assertEquals(body.project.budget, 40);
  assertEquals(body.project.budget_units, "Hours");
});
