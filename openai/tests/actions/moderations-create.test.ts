import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/moderations-create.ts";

Deno.test("moderations-create: POSTs to /moderations with default model", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({ input: "hi" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/moderations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.input, "hi");
  assertEquals(body.model, "omni-moderation-latest");
});

Deno.test("moderations-create: honors caller-provided model", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ input: "hi", model: "text-moderation-latest" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "text-moderation-latest");
});
