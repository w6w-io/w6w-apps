import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-design-autofill-job.ts";

Deno.test("create-design-autofill-job: builds a create_from_brand_template body", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "j1", status: "in_progress" } } }]);
  const data = { headline: { type: "text", text: "Hello" } };
  const result = await action.execute({
    source: "create_from_brand_template",
    brandTemplateId: "BT1",
    data,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/autofills");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "create_from_brand_template",
    data,
    brand_template_id: "BT1",
  });
  assertEquals(result, { id: "j1", status: "in_progress" });
});

Deno.test("create-design-autofill-job: builds an update_design body with design_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: {} } }]);
  const data = { photo: { type: "image", asset_id: "A1" } };
  await action.execute({ source: "update_design", designId: "DAabc", data }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { type: "update_design", data, design_id: "DAabc" });
});
