import { assertEquals, assertRejects } from "@std/assert";
import recordGet from "../../actions/record-get.ts";
import { mockKnackCtx } from "../_helpers.ts";

Deno.test("record-get: GETs the record by object and record id", async () => {
  const record = { id: "58643557d1ea9432222f3cbb", field_1: "Pearl Architectural Design" };
  const { ctx, calls } = mockKnackCtx([{ body: record }]);
  const result = await recordGet.execute(
    { objectKey: "object_1", recordId: "58643557d1ea9432222f3cbb" },
    ctx,
  );
  assertEquals(result, record);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.knack.com/v1/objects/object_1/records/58643557d1ea9432222f3cbb",
  );
});

Deno.test("record-get: surfaces Knack's plain-text error body as a readable error, not a parse failure", async () => {
  const { ctx } = mockKnackCtx([{ status: 400, body: "No record found for the given id." }]);
  await assertRejects(
    async () => {
      await recordGet.execute({ objectKey: "object_1", recordId: "nope" }, ctx);
    },
    Error,
    "No record found",
  );
});
