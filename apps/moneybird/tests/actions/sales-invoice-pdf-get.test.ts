import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/sales-invoice-pdf-get.ts";
import { mockMoneybirdCtx, pathOf } from "../_helpers.ts";

Deno.test("sales-invoice-pdf-get: returns the Location header without fetching the file", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{
    status: 302,
    headers: { location: "https://moneybird-storage:3100/abc/def/download" },
  }]);
  const out = await action.execute({ id: "i1" }, ctx) as { downloadUrl: string };
  assertEquals(calls.length, 1, "must not follow the redirect itself");
  assertEquals(pathOf(calls[0].url), "/api/v2/123/sales_invoices/i1/download_pdf.json");
  assertEquals(out.downloadUrl, "https://moneybird-storage:3100/abc/def/download");
});

Deno.test("sales-invoice-pdf-get: hideStationery sets media=stationery", async () => {
  const { ctx, calls } = mockMoneybirdCtx([{ status: 302, headers: { location: "https://x/y" } }]);
  await action.execute({ id: "i1", hideStationery: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("media"), "stationery");
});

Deno.test("sales-invoice-pdf-get: a 404 surfaces the vendor's message", async () => {
  const { ctx } = mockMoneybirdCtx([{ status: 404, body: { error: "record not found" } }]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ id: "nope" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("record not found"), true, err.message);
});
