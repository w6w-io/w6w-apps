import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-email.ts";

Deno.test("create-email: POSTs /crm/v3/objects/emails with required subject", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1" } }]);
  await action.execute!(
    { hs_email_subject: "Welcome!", hs_email_direction: "EMAIL", hs_email_text: "Hi" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/emails");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.hs_email_subject, "Welcome!");
  assertEquals(body.properties.hs_email_direction, "EMAIL");
});
