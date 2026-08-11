import { assert, assertEquals, assertRejects } from "@std/assert";
import projectCreate from "../../actions/project-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-create: POSTs /v1/projects with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await projectCreate.execute({ name: "Launch", workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/projects");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { name: "Launch", workspaceId: "ws1" });
});

/**
 * A template project sends `projectDefinitionId` and `stages` together — Motion
 * rejects the pair with a 400 naming the expected stage count when they do not
 * match, which is why `stages` travels as structured JSON rather than as text.
 */
Deno.test("project-create: stages are sent as a parsed JSON array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await projectCreate.execute({
    name: "Launch",
    workspaceId: "ws1",
    projectDefinitionId: "pd1",
    stages: '[{"stageDefinitionId":"sd1","dueDate":"2026-09-01"}]',
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    name: "Launch",
    workspaceId: "ws1",
    projectDefinitionId: "pd1",
    stages: [{ stageDefinitionId: "sd1", dueDate: "2026-09-01" }],
  });
});

Deno.test("project-create: malformed stage JSON fails before a request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await projectCreate.execute({ name: "n", workspaceId: "ws1", stages: "{not json" }, ctx);
    },
    Error,
    "Stages is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-create: labels are names, and priority is the four-value task list", () => {
  const priority = projectCreate.params?.find((p) => p.key === "priority");
  const values = (priority?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values, ["ASAP", "HIGH", "MEDIUM", "LOW"]);
  assert(projectCreate.params?.some((p) => p.key === "labels" && p.type === "array"));
  assertEquals(projectCreate.idempotent, false);
});
