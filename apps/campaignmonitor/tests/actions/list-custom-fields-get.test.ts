import { assertEquals } from "@std/assert";
import listCustomFieldsGet from "../../actions/list-custom-fields-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-custom-fields-get: GETs /lists/{listid}/customfields.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listCustomFieldsGet.execute({ listId: "lid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/lid/customfields.json`);
});

/**
 * FieldName and Key are different strings — "subscription date" versus
 * "[subscriptiondate]". Both are passed through unnormalised, because the
 * vendor's own request and response examples disagree about which one a write
 * wants.
 */
Deno.test("list-custom-fields-get: returns both the display name and the bracketed key", async () => {
  const fields = [{
    FieldName: "subscription date",
    Key: "[subscriptiondate]",
    DataType: "Date",
    FieldOptions: [],
    VisibleInPreferenceCenter: false,
  }];
  const { ctx } = mockCtx([{ body: fields }]);
  const out = await listCustomFieldsGet.execute({ listId: "lid" }, ctx);
  assertEquals(out[0].FieldName, "subscription date");
  assertEquals(out[0].Key, "[subscriptiondate]");
});
