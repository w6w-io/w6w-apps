import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-design-dataset.ts";

Deno.test("get-design-dataset: GETs /rest/v1/designs/{id}/dataset", async () => {
  const { ctx, calls } = mockCtx([{ body: { dataset: { headline: { type: "text" } } } }]);
  const result = await action.execute({ designId: "abc123" }, ctx) as { dataset: unknown };
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs/abc123/dataset");
  assertEquals(result.dataset, { headline: { type: "text" } });
});
