import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-identify.ts";

const display = { display: { instance: "iad-01" } };

Deno.test("user-identify: posts identify arrays and merge_behavior", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], display);
  await action.execute!({
    emailsToIdentify: [{ external_id: "e1", email: "a@b.com" }],
    mergeBehavior: "merge",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users/identify");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emails_to_identify, [{ external_id: "e1", email: "a@b.com" }]);
  assertEquals(body.merge_behavior, "merge");
  assertEquals(body.aliases_to_identify, undefined);
});
