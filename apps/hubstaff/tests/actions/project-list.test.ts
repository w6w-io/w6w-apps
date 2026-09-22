import { assert, assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: GETs the organization's projects and keeps status=active", async () => {
  const body = listEnvelope("projects", [{ id: 841201, name: "DevSecOps" }], 3);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!(
    { organization_id: 13, status: "active" },
    ctx,
  ) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/projects");
  assertEquals(queryOf(calls[0].url), { status: "active" });
  assertEquals(result.projects[0].id, 841201);
});

/**
 * The vendor's own default for `status` is `active`, so the prefill matches it
 * rather than widening the read — and the hint has to say so, because a
 * workflow that assumes "list projects" means all of them will silently miss
 * archived ones.
 */
Deno.test("project-list: prefills the vendor's active default and says archived is excluded", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assertEquals(status.default, "active");
  assert(/archived projects are\s+absent/.test(status.hint!), status.hint!);
});

Deno.test("project-list: array filters go on the wire as one CSV value", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("projects", []) }]);
  await action.execute!({
    organization_id: 13,
    status: "all",
    project_ids: "1,2,3",
    include: "clients",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    status: "all",
    project_ids: "1,2,3",
    include: "clients",
  });
});
