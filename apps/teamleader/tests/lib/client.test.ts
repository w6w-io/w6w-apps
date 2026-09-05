import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, call, callWithMeta, compact, TeamleaderError } from "../../lib/client.ts";

Deno.test("call: POSTs to API_URL/<method> with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "1" } } }]);
  const out = await call(ctx, "contacts.info", { id: "1" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_URL}/contacts.info`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { id: "1" });
  assertEquals(out, { id: "1" });
});

Deno.test("call: sends {} when body is omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "u1" } } }]);
  await call(ctx, "users.me");
  assertEquals(calls[0].body, "{}");
});

Deno.test("call: a 204 resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await call(ctx, "contacts.delete", { id: "1" });
  assertEquals(out, undefined);
});

Deno.test("call: a non-2xx throws TeamleaderError carrying the errors[].title list", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { errors: [{ title: "Company name must not be empty" }] },
  }]);
  const err = await assertRejects(
    () => call(ctx, "companies.add", { name: "" }),
    TeamleaderError,
  );
  assertEquals(err.status, 400);
  assertEquals(err.titles, ["Company name must not be empty"]);
  assert(err.message.includes("Company name must not be empty"));
});

Deno.test("call: a non-2xx with an unreadable body still throws with the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "not json" }]);
  const err = await assertRejects(() => call(ctx, "users.me"), TeamleaderError);
  assertEquals(err.status, 401);
  assertEquals(err.titles, []);
});

Deno.test("callWithMeta: returns both data and meta", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [{ id: "1" }], meta: { page: { size: 20, number: 1 }, matches: 42 } },
  }]);
  const { data, meta } = await callWithMeta<unknown[], { matches?: number }>(ctx, "contacts.list");
  assertEquals(data, [{ id: "1" }]);
  assertEquals(meta?.matches, 42);
});

Deno.test("compact: drops undefined and empty-string values, keeps everything else", () => {
  assertEquals(
    compact({ a: "x", b: undefined, c: "", d: 0, e: false, f: [] }),
    { a: "x", d: 0, e: false, f: [] },
  );
});
