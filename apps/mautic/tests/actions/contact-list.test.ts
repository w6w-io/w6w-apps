import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

Deno.test("contact-list: GETs /contacts and unwraps the `contacts` map into an array", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, contacts: { "47": { id: 47 } } } },
  ], conn);
  const out = await action.execute!({ search: "email:*@acme.com" }, ctx);
  assertEquals(out, [{ id: 47 }]);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search"), "email:*@acme.com");
  assertEquals(url.searchParams.get("start"), "0");
});

Deno.test("contact-list: publishedOnly=true sends publishedOnly=1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { total: 0, contacts: {} } }], conn);
  await action.execute!({ publishedOnly: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("publishedOnly"), "1");
});

Deno.test("contact-list: limit caps the number of rows returned", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { total: 2, contacts: { "1": { id: 1 }, "2": { id: 2 } } } },
  ], conn);
  const out = await action.execute!({ limit: 1 }, ctx) as unknown[];
  assertEquals(out.length, 1);
});
