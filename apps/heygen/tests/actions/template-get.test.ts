import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: fetches by id and returns the template's variable schema unwrapped", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "tpl_1",
        name: "Quarterly Update",
        variables: { headline: { type: "text" } },
      }),
    },
  ]);
  const out = await templateGet.execute({ templateId: "tpl_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/templates/tpl_1");
  assertEquals(out, {
    id: "tpl_1",
    name: "Quarterly Update",
    variables: { headline: { type: "text" } },
  });
});
