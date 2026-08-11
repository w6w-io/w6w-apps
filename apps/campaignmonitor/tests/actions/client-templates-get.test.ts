import { assertEquals } from "@std/assert";
import clientTemplatesGet from "../../actions/client-templates-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client-templates-get: GETs /clients/{clientid}/templates.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await clientTemplatesGet.execute({ clientId: "cid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/templates.json`);
});

/**
 * The preview URLs live on preview.createsend.com, which is deliberately absent
 * from network.allow — they are returned as data and never fetched. One request
 * total is what proves that.
 */
Deno.test("client-templates-get: returns preview URLs without fetching them", async () => {
  const templates = [{
    TemplateID: "t1",
    Name: "Template One",
    PreviewURL: "https://preview.createsend.com/templates/publicpreview/01AF532CD8889B33?d=r",
    ScreenshotURL: "https://preview.createsend.com/ts/r/14/833/263/14833263.jpg?0318092541",
  }];
  const { ctx, calls } = mockCtx([{ body: templates }]);
  const out = await clientTemplatesGet.execute({ clientId: "cid" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out[0].PreviewURL, templates[0].PreviewURL);
});
