import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-list.ts";

Deno.test("pipeline-list: GETs /pipelines", async () => {
  const { ctx, calls } = mockCtx([{ body: { pipelines: [{ id: 1, name: "Sales" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/pipelines");
  assertEquals(out, { pipelines: [{ id: 1, name: "Sales" }], nextPage: undefined });
});

Deno.test("pipeline-list: includeDeleted is passed through as a query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: { pipelines: [] } }]);
  await action.execute({ includeDeleted: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeDeleted"), "true");
});
