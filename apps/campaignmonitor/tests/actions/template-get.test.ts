import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GETs /templates/{templateid}.json", async () => {
  const template = {
    TemplateID: "5cac213cf061dd4e008de5a82b7a3621",
    Name: "Template One",
    PreviewURL: "https://preview.createsend.com/templates/publicpreview/01AF532CD8889B33?d=r",
  };
  const { ctx, calls } = mockCtx([{ body: template }]);
  const out = await templateGet.execute(
    { templateId: "5cac213cf061dd4e008de5a82b7a3621" },
    ctx,
  );
  assertEquals(
    pathOf(calls[0].url),
    `${API_PATH}/templates/5cac213cf061dd4e008de5a82b7a3621.json`,
  );
  assertEquals(out, template);
  // The preview URL is data, never fetched.
  assertEquals(calls.length, 1);
});
