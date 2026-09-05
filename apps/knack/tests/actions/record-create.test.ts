import { assertEquals, assertRejects } from "@std/assert";
import recordCreate from "../../actions/record-create.ts";
import { mockKnackCtx } from "../_helpers.ts";

Deno.test("record-create: POSTs the field values as JSON to the object's records route", async () => {
  const created = { id: "58645233669adec2460888c4", field_1: "Name of new company" };
  const { ctx, calls } = mockKnackCtx([{ body: created }]);
  const result = await recordCreate.execute(
    { objectKey: "object_1", fields: { field_1: "Name of new company" } },
    ctx,
  );
  assertEquals(result, created);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.knack.com/v1/objects/object_1/records");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { field_1: "Name of new company" });
});

Deno.test("record-create: accepts fields typed as a JSON string, same as an object", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: { id: "r1" } }]);
  await recordCreate.execute(
    { objectKey: "object_1", fields: '{"field_1":"Acme"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { field_1: "Acme" });
});

Deno.test("record-create: refuses empty field values without making a request", async () => {
  const { ctx, calls } = mockKnackCtx([]);
  await assertRejects(
    async () => {
      await recordCreate.execute({ objectKey: "object_1", fields: "" }, ctx);
    },
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
