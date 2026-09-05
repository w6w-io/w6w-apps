import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-fields-list.ts";

Deno.test("contact-fields-list: GETs contact/allfields with type=json (not resfmt) and unwraps the nested response", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        response: {
          message: "success",
          code: "0",
          fieldname: [{ DISPLAY_NAME: "Contact Email", FIELD_NAME: "contact_email" }],
        },
      },
    },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/contact/allfields");
  assertEquals(url.searchParams.get("type"), "json");
  assertEquals(url.searchParams.has("resfmt"), false);
  assertEquals(out, { fields: [{ DISPLAY_NAME: "Contact Email", FIELD_NAME: "contact_email" }] });
});
