import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: GETs /task/ with nothing when nothing is asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ task_id: 5 }] }]);
  assertEquals(await taskList.execute({}, ctx), { tasks: [{ task_id: 5 }] });
  assertEquals(pathOf(calls[0].url), "/task/");
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * `completed` is tri-state: true, false, and ABSENT (both). A prefilled default
 * would silently hide completed tasks from a workflow that meant to count
 * everything, so the param must carry no default and both booleans must be
 * expressible.
 */
Deno.test("task-list: completed is tri-state, and absence is the third state", async () => {
  const param = taskList.params!.find((p) => p.key === "completed")!;
  assertEquals(param.default, undefined);

  const yes = mockCtx([{ body: [] }]);
  await taskList.execute({ completed: true }, yes.ctx);
  assertEquals(queryOf(yes.calls[0].url), { completed: "true" });

  const no = mockCtx([{ body: [] }]);
  await taskList.execute({ completed: false }, no.ctx);
  assertEquals(queryOf(no.calls[0].url), { completed: "false" });

  const both = mockCtx([{ body: [] }]);
  await taskList.execute({}, both.ctx);
  assertEquals(queryOf(both.calls[0].url).completed, undefined);
});

Deno.test("task-list: list filters join with a semicolon, Podio's documented form", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await taskList.execute({
    responsible: ["1", "2"],
    space: "7",
    org: ["3"],
    reference: "item:9, item:10",
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.responsible, "1;2");
  assertEquals(query.space, "7");
  assertEquals(query.org, "3");
  assertEquals(query.reference, "item:9;item:10");
});

Deno.test("task-list: every documented scalar filter maps to its snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await taskList.execute({
    externalId: "x-1",
    dueDate: "2026-01-01-2026-12-31",
    createdOn: "2026-01-01-2026-06-30",
    completedOn: "2026-02-01-2026-02-28",
    grouping: "due_date",
    sortBy: "created_on",
    sortDesc: true,
    view: "full",
    limit: 30,
    offset: 60,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    external_id: "x-1",
    due_date: "2026-01-01-2026-12-31",
    created_on: "2026-01-01-2026-06-30",
    completed_on: "2026-02-01-2026-02-28",
    grouping: "due_date",
    sort_by: "created_on",
    sort_desc: "true",
    view: "full",
    limit: "30",
    offset: "60",
  });
});

/**
 * Podio's default projection silently omits description, files and labels. A
 * workflow reading them gets undefined with no error, so the option has to be
 * reachable and its hint has to say what it does.
 */
Deno.test("task-list: the detail level is exposed, with what the default omits spelled out", () => {
  const view = taskList.params!.find((p) => p.key === "view")!;
  assertEquals(view.validation?.enum, ["full"]);
  assertEquals(view.hint!.includes("omits them without saying so"), true);
});

Deno.test("task-list: an empty body yields an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await taskList.execute({}, ctx), { tasks: [] });
});
