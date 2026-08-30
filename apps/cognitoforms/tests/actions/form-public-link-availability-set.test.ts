import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-public-link-availability-set.ts";

Deno.test("form-public-link-availability-set: POSTs Start/End/Message to /forms/{formId}/public-link-availability", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        AvailabilityStart: "2020-01-01T00:00:00Z",
        AvailabilityEnd: "2050-01-01T00:00:00Z",
        NotAvailableMessage: "This form is no longer available.",
      },
    },
  ]);
  const result = await action.execute({
    formId: "42",
    start: "2020-01-01T00:00:00Z",
    end: "2050-01-01T00:00:00Z",
    message: "This form is no longer available.",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms/42/public-link-availability");
  assertEquals(JSON.parse(calls[0].body!), {
    Start: "2020-01-01T00:00:00Z",
    End: "2050-01-01T00:00:00Z",
    Message: "This form is no longer available.",
  });
  assertEquals(result, {
    AvailabilityStart: "2020-01-01T00:00:00Z",
    AvailabilityEnd: "2050-01-01T00:00:00Z",
    NotAvailableMessage: "This form is no longer available.",
  });
});

Deno.test("form-public-link-availability-set: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
