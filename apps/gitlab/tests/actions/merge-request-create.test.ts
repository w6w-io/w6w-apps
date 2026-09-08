import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/merge-request-create.ts";

Deno.test("merge-request-create: POSTs /projects/{id}/merge_requests", async () => {
  const { ctx, calls } = mockCtx([{ body: { iid: 1 } }]);
  await action.execute(
    { projectId: "group/project", sourceBranch: "feat", targetBranch: "main", title: "Feature" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/projects/group%2Fproject/merge_requests");
  assertEquals(JSON.parse(calls[0].body!), {
    source_branch: "feat",
    target_branch: "main",
    title: "Feature",
  });
});

Deno.test("merge-request-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("merge-request-create: sends labels as a CSV string, id lists as numbers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    {
      projectId: "1",
      sourceBranch: "feat",
      targetBranch: "main",
      title: "Feature",
      labels: "a, b",
      assigneeIds: "1, 2",
      reviewerIds: "3, 4",
      milestoneId: 7,
      squash: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.labels, "a,b");
  assertEquals(body.assignee_ids, [1, 2]);
  assertEquals(body.reviewer_ids, [3, 4]);
  assertEquals(body.milestone_id, 7);
  assertEquals(body.squash, true);
});

Deno.test("merge-request-create: omits the new optional fields when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { projectId: "1", sourceBranch: "feat", targetBranch: "main", title: "Feature" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body).sort(), ["source_branch", "target_branch", "title"]);
});
