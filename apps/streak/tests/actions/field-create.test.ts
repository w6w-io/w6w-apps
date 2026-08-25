import { assert, assertEquals } from "@std/assert";
import fieldCreate from "../../actions/field-create.ts";
import { FIELD_TYPES } from "../../lib/params.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-create: PUTs a form body with name and type", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "NewField", key: "1010", type: "TEXT_INPUT" } }]);
  await fieldCreate.execute({ pipelineKey: "p1", name: "NewField", type: "TEXT_INPUT" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/fields");
  assertEquals(calls[0].body, "name=NewField&type=TEXT_INPUT");
});

/** PERSON is a built-in field type, never a creatable one — see lib/params.ts. */
Deno.test("field-create: PERSON is not offered as a creatable type", () => {
  const typeParam = fieldCreate.params!.find((p) => p.key === "type")!;
  const values = (typeParam.options as Array<{ value: string }>).map((o) => o.value);
  assert(!values.includes("PERSON"), "PERSON should not be a creatable field type");
  assertEquals(values.sort(), [...FIELD_TYPES].sort());
});
