import { assert, assertEquals } from "@std/assert";
import projectList from "../../actions/project-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: maps every filter onto the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1" }] }]);
  const page = await projectList.execute({
    query: "Smith",
    status: "active",
    modifiedSince: "2026-08-01T00:00:00Z",
    page: 2,
    perPage: 25,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/projects");
  assertEquals(queryOf(calls[0].url), {
    query: "Smith",
    status: "active",
    modified_since: "2026-08-01T00:00:00Z",
    page: "2",
    per_page: "25",
  });
  assertEquals(page.count, 1);
});

Deno.test("project-list: sends no status filter when none is chosen", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await projectList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-list: offers the two documented statuses and says the default returns all", () => {
  const status = projectList.params!.find((p) => p.key === "status")!;
  assertEquals(
    (status.options as Array<{ value: string }>).map((o) => o.value),
    ["active", "deleted"],
  );
  assert(/including deleted/i.test(status.hint!), status.hint);
});
