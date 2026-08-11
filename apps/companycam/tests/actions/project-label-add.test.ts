import { assertEquals, assertRejects } from "@std/assert";
import projectLabelAdd from "../../actions/project-label-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The label body nests under `project`; the photo-tag body does not. */
Deno.test("project-label-add: nests the labels under project", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await projectLabelAdd.execute({ projectId: "1", labels: ["Roof", "Urgent"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/labels");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { project: { labels: ["Roof", "Urgent"] } });
});

Deno.test("project-label-add: accepts a comma-separated list", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await projectLabelAdd.execute({ projectId: "1", labels: "Roof, Urgent" }, ctx);
  assertEquals(bodyOf(calls[0]), { project: { labels: ["Roof", "Urgent"] } });
});

Deno.test("project-label-add: refuses an empty list rather than sending one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await projectLabelAdd.execute({ projectId: "1", labels: [] }, ctx),
    Error,
    "At least one label",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-label-add: is non-idempotent — no documented de-duplication", () => {
  assertEquals(projectLabelAdd.idempotent, false);
});
