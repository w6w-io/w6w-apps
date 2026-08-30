import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-points-subtract.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-points-subtract: POSTs /contacts/{id}/points/minus/{points}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute!({ contactId: 1, points: 3 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://mautic.example.com/api/contacts/1/points/minus/3");
});

Deno.test("contact-points-subtract: is not idempotent — each call subtracts again", () => {
  assertEquals(action.idempotent, false);
});
