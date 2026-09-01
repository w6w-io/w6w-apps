import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: GETs /invoices/invoices, page defaulted to 1", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { invoices: [] } } } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/accounting/account/acc1/invoices/invoices");
  assertEquals(url.searchParams.get("page"), "1");
});

Deno.test("invoice-list: wraps search filters as search[name]", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { invoices: [] } } } }]);
  await action.execute({ search: { customerid: "806" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search[customerid]"), "806");
});
