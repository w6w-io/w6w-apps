import { assert, assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

Deno.test("project-create: posts the project body and returns the created project", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 201, body: { project: { id: "p1", name: "New" } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ name: "New", description: "d" }, ctx);
  assertEquals(result, { id: "p1", name: "New" });
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.project.name, "New");
  assertEquals(body.project.description, "d");
  assertEquals(body.project.contentPermissions, "ManagedByOwner");
});

Deno.test("project-create: requires a name before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(() => Promise.resolve(action.execute!({}, ctx)), Error, "`name` is required");
  assertEquals(calls.length, 0);
  assert(action.idempotent === false, "creating a project is not idempotent");
});
