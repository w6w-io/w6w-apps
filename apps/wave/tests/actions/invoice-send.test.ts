import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import invoiceSend from "../../actions/invoice-send.ts";

Deno.test("invoice-send: splits a comma-separated `to` into a list and defaults attachPDF", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { invoiceSend: { didSucceed: true, inputErrors: [] } } },
  }]);
  const out = await invoiceSend.execute(
    { invoiceId: "inv1", to: "a@example.com, b@example.com" },
    ctx,
  ) as { didSucceed: boolean };
  assertEquals(out.didSucceed, true);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.to, ["a@example.com", "b@example.com"]);
  assertEquals(body.variables.input.attachPDF, true);
});

Deno.test("invoice-send: a rejected send throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        invoiceSend: {
          didSucceed: false,
          inputErrors: [{
            code: "INVALID",
            message: "Invoice must be saved first.",
            path: ["input", "invoiceId"],
          }],
        },
      },
    },
  }]);
  let threw = false;
  try {
    await invoiceSend.execute({ invoiceId: "draft1", to: "a@example.com" }, ctx);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("invoice-send: type/resource/idempotency metadata", () => {
  assertEquals(invoiceSend.type, "perform");
  assertEquals(invoiceSend.resource, "invoice");
  assertEquals(invoiceSend.idempotent, false);
});
