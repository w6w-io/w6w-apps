import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-subsites.ts";

Deno.test("list-subsites: GETs {site}/sites", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "sub1" }] } }]);
  const out = await action.execute({ hostname: "contoso.sharepoint.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/contoso.sharepoint.com/sites");
  assertEquals(out.value, [{ id: "sub1" }]);
});

Deno.test("list-subsites: no site addressed defaults to the tenant root", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/sites");
});

Deno.test("list-subsites: a nextLink is replayed verbatim, with no other query params", async () => {
  const nextLink = "https://graph.microsoft.com/v1.0/sites/root/sites?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink, top: 5 }, ctx);
  assertEquals(calls[0].url, nextLink);
});

Deno.test("list-subsites: Fetch all pages walks @odata.nextLink up to the page cap", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        value: [{ id: "1" }],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/sites/root/sites?$skiptoken=a",
      },
    },
    { body: { value: [{ id: "2" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.map((s) => s.id), ["1", "2"]);
  assertEquals(out.pages, 2);
});
