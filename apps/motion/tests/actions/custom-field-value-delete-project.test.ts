import { assertEquals } from "@std/assert";
import customFieldValueDeleteProject from "../../actions/custom-field-value-delete-project.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-value-delete-project: DELETEs the value from a project", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await customFieldValueDeleteProject.execute({ projectId: "p1", valueId: "v1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/beta/custom-field-values/project/p1/custom-fields/v1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { valueId: "v1", status: 204 });
});

Deno.test("custom-field-value-delete-project: both ids are path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await customFieldValueDeleteProject.execute({ projectId: "a/b", valueId: "c/d" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    "/beta/custom-field-values/project/a%2Fb/custom-fields/c%2Fd",
  );
  assertEquals(customFieldValueDeleteProject.idempotent, true);
});
