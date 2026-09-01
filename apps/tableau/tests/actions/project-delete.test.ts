import { assert, assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/project-delete.ts";

Deno.test("project-delete: refuses without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(
    () => Promise.resolve(action.execute!({ projectId: "p1" }, ctx)),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("project-delete: deletes and reports back, confirmed", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display: DEFAULT_DISPLAY });
  const result = await action.execute!({ projectId: "p1", confirm: true }, ctx);
  assertEquals(result, { projectId: "p1", deleted: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/projects/p1");
});

Deno.test("project-delete: is declared idempotent", () => {
  assert(action.idempotent === true);
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assertEquals(confirm!.required, true);
});
