import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/record-event.ts";

Deno.test("record-event: POSTs a single-element events array", async () => {
  const { ctx, calls } = mockDripCtx([{ status: 204 }]);
  const out = await action.execute({ email: "john@acme.com", action: "Logged in" }, ctx);
  assertEquals(calls[0].url, "https://api.getdrip.com/v2/1234567/events");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    events: [{ email: "john@acme.com", action: "Logged in", prospect: true }],
  });
  assertEquals(out, { success: true });
});

Deno.test("record-event: forwards occurredAt and properties", async () => {
  const { ctx, calls } = mockDripCtx([{ status: 204 }]);
  await action.execute(
    {
      email: "john@acme.com",
      action: "Started a trial",
      occurredAt: "2014-03-22T03:00:00Z",
      prospect: false,
      properties: { affiliate_code: "XYZ" },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    events: [{
      email: "john@acme.com",
      action: "Started a trial",
      occurred_at: "2014-03-22T03:00:00Z",
      prospect: false,
      properties: { affiliate_code: "XYZ" },
    }],
  });
});

Deno.test("record-event: is declared non-idempotent — replaying it records a second event", () => {
  assertEquals(action.idempotent, false);
});
