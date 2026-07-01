import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submit-form.ts";

Deno.test("submit-form: POSTs the api.hsforms.com submission endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { inlineMessage: "Thanks!" } }]);
  await action.execute!(
    {
      portalId: "12345",
      formId: "form-uuid",
      fields: [{ name: "email", value: "a@x" }],
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.hsforms.com");
  assertEquals(url.pathname, "/submissions/v3/integration/submit/12345/form-uuid");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields[0].name, "email");
});
