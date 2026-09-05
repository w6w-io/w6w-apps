import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-create.ts";

Deno.test("quote-create: POSTs /quotes with client_id, date, due_date and line items", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "q1" } }]);
  await action.execute(
    { clientId: "cl1", date: "2026-09-05", dueDate: "2026-09-19", lineItems: [{ cost: 10 }] },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/quotes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.client_id, "cl1");
  assertEquals(body.date, "2026-09-05");
  assertEquals(body.due_date, "2026-09-19");
  assertEquals(body.line_items, [{ cost: 10 }]);
});
