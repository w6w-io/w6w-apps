import { assertEquals } from "@std/assert";
import issueCreate from "../../actions/issue-create.ts";
import { BASE_URL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issue-create: POSTs /issue with a plain-string description, not ADF", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: { id: "10001", key: "ENG-1", self: `${BASE_URL}/rest/api/2/issue/10001` },
    },
  ]);
  const out = await issueCreate.execute({
    projectKey: "ENG",
    issueType: "Task",
    summary: "Fix the thing",
    description: "Plain text body",
    assigneeUsername: "jdoe",
    priority: "High",
    labels: "bug, urgent",
    parentKey: "ENG-1",
  }, ctx) as { key: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue");
  const body = JSON.parse(calls[0].body!) as { fields: Record<string, unknown> };
  assertEquals(body.fields.description, "Plain text body");
  assertEquals(body.fields.assignee, { name: "jdoe" });
  assertEquals(body.fields.labels, ["bug", "urgent"]);
  assertEquals(body.fields.parent, { key: "ENG-1" });
  assertEquals(out.key, "ENG-1");
});

Deno.test("issue-create: is not idempotent", () => {
  assertEquals(issueCreate.idempotent, false);
});
