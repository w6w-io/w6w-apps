import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-design.ts";

Deno.test("create-design: POSTs a preset type_and_asset body", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: { id: "new1" } } }]);
  const result = await action.execute({
    source: "type_and_asset",
    presetName: "presentation",
    assetId: "Msd59349ff",
    title: "My Holiday",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/designs");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    type: "type_and_asset",
    design_type: { type: "preset", name: "presentation" },
    asset_id: "Msd59349ff",
    title: "My Holiday",
  });
  assertEquals(result, { id: "new1" });
});

Deno.test("create-design: builds a custom-size design_type when no preset is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: {} } }]);
  await action.execute({ source: "type_and_asset", customWidth: 800, customHeight: 600 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.design_type, { type: "custom", width: 800, height: 600 });
});

Deno.test("create-design: builds a copy-of-design body", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: {} } }]);
  await action.execute({ source: "design", sourceDesignId: "DAabc", pageNumbers: [1, 2] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { type: "design", design_id: "DAabc", page_numbers: [1, 2] });
});

Deno.test("create-design: builds a copy-from-brand-template body", async () => {
  const { ctx, calls } = mockCtx([{ body: { design: {} } }]);
  await action.execute({ source: "brand_template", sourceBrandTemplateId: "BTabc" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "brand_template");
  assertEquals(body.brand_template_id, "BTabc");
});
