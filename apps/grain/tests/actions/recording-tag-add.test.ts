import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-tag-add.ts";

Deno.test("recording-tag-add: PUTs the tag in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ recordingId: "r1", tag: "my-new-tag" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/tags");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { tag: "my-new-tag" });
  assertEquals(result, { success: true });
});

Deno.test("recording-tag-add: validates against Grain's own tag regex", () => {
  const pattern = new RegExp(
    action.params?.find((p) => p.key === "tag")?.validation?.pattern ?? "",
    "u",
  );
  assertEquals(pattern.test("my-new-tag"), true);
  assertEquals(pattern.test("-leading-dash"), false);
});

Deno.test("recording-tag-add: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
