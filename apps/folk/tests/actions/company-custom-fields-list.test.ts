import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-custom-fields-list.ts";
import { NETWORK_PLACEHOLDER } from "../../lib/client.ts";

Deno.test("company-custom-fields-list: GETs the group's company custom fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "cf1", groupId: "g1", contactType: "company", name: "Stage", type: "textField" }],
  }]);
  const out = await action.execute({ groupId: "g1" }, ctx) as {
    customFields: Array<{ name: string }>;
  };
  assertEquals(
    calls[0].url,
    `https://api.folk.app/network/${NETWORK_PLACEHOLDER}/group/g1/company/custom-fields`,
  );
  assertEquals(out.customFields[0].name, "Stage");
});
