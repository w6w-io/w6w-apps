import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/invoice-send-email.ts";

Deno.test("invoice-send-email: POSTs /invoices/:id/send_email with the email fields given", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 200 }]);
  await action.execute({
    invoiceId: "7",
    to: "customer@example.com",
    from: "John Doe <john@example.com>",
    subject: "Your invoice",
    body: "Please find attached.",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/invoices/7/send_email");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    invoice: {
      email: {
        to: "customer@example.com",
        from: "John Doe <john@example.com>",
        subject: "Your invoice",
        body: "Please find attached.",
      },
    },
  });
});

Deno.test("invoice-send-email: useTemplate sends only use_template, ignoring to/from/subject/body", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 200 }]);
  await action.execute({
    invoiceId: "7",
    useTemplate: true,
    to: "ignored@example.com",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { invoice: { email: { use_template: true } } });
});
