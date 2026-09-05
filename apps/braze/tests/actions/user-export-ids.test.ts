import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-export-ids.ts";

Deno.test("user-export-ids: posts identifiers and fields_to_export", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { users: [{ external_id: "e1" }] } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({
    externalIds: ["e1"],
    emailAddress: "",
    fieldsToExport: ["email", "first_name"],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/export/ids");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.external_ids, ["e1"]);
  assertEquals(body.email_address, undefined);
  assertEquals(body.fields_to_export, ["email", "first_name"]);
  assertEquals(result, { users: [{ external_id: "e1" }] });
});
