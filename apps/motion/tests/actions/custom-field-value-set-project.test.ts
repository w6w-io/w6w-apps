import { assertEquals } from "@std/assert";
import customFieldValueSetProject from "../../actions/custom-field-value-set-project.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("custom-field-value-set-project: POSTs the tagged value pair to /beta", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "select", value: "Q3" } }]);
  await customFieldValueSetProject.execute({
    projectId: "p1",
    customFieldInstanceId: "cf1",
    type: "select",
    value: '"Q3"',
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/beta/custom-field-values/project/p1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    customFieldInstanceId: "cf1",
    value: { type: "select", value: "Q3" },
  });
});

Deno.test("custom-field-value-set-project: the project id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await customFieldValueSetProject.execute(
    { projectId: "a/b", customFieldInstanceId: "cf1", type: "text", value: '"x"' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/beta/custom-field-values/project/a%2Fb");
  assertEquals(customFieldValueSetProject.idempotent, true);
});
