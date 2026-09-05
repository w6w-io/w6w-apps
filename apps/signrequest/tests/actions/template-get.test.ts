import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GETs /templates/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "tpl-1", name: "NDA Template" } }]);
  const out = await templateGet.execute({ templateId: "tpl-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0]), "/api/v1/templates/tpl-1/");
  assertEquals(out.name, "NDA Template");
});
