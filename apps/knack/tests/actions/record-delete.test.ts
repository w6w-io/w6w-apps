import { assertEquals } from "@std/assert";
import recordDelete from "../../actions/record-delete.ts";
import { mockKnackCtx } from "../_helpers.ts";

Deno.test("record-delete: DELETEs the record and returns Knack's {delete: true}", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: { delete: true } }]);
  const result = await recordDelete.execute(
    { objectKey: "object_1", recordId: "58645233669adec2460888c4" },
    ctx,
  );
  assertEquals(result, { delete: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(
    calls[0].url,
    "https://api.knack.com/v1/objects/object_1/records/58645233669adec2460888c4",
  );
});
