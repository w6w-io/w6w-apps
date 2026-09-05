import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-field-create.ts";

Deno.test("contact-field-create: POSTs custom/add with type=json and unwraps the nested response", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        response: {
          message: "Success",
          fieldtype: "Text",
          code: "200",
          fieldname: "FIELDNAME1",
        },
      },
    },
  ]);
  const out = await action.execute(
    { fieldName: "FIELDNAME1", fieldType: "Text", fieldLength: 10 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/custom/add");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("type"), "json");
  assertEquals(url.searchParams.get("fieldname"), "FIELDNAME1");
  assertEquals(url.searchParams.get("fieldtype"), "Text");
  assertEquals(url.searchParams.get("fieldlength"), "10");
  assertEquals(out, { message: "Success", fieldName: "FIELDNAME1", fieldType: "Text" });
});
