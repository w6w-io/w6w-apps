import { assertEquals } from "@std/assert";
import invoiceIssue from "../../actions/invoice-issue.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-issue: posts to /invoices/{id}/issue", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "inv_1", status: "issued", short_url: "https://rzp.io/i/1" },
  }]);
  const out = await invoiceIssue.execute({ id: "inv_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/invoices/inv_1/issue");
  assertEquals(out, { id: "inv_1", status: "issued", short_url: "https://rzp.io/i/1" });
});
