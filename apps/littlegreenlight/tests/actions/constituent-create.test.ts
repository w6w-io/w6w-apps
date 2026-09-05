import { assertEquals } from "@std/assert";
import constituentCreate from "../../actions/constituent-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("constituent-create: POSTs to /api/v1/constituents.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, first_name: "Ada", last_name: "Lovelace" } }]);
  await constituentCreate.execute({ first_name: "Ada", last_name: "Lovelace" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/constituents.json");
  assertEquals(calls[0].method, "POST");
});

Deno.test("constituent-create: an unset email sends an empty email_addresses array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await constituentCreate.execute({ first_name: "Ada", last_name: "Lovelace" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_addresses, []);
});

Deno.test("constituent-create: a set email builds a single-element email_addresses array", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await constituentCreate.execute(
    { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_addresses, [{ address: "ada@example.com" }]);
});

Deno.test("constituent-create: is_org and org_name pass through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await constituentCreate.execute(
    { first_name: "Jane", last_name: "Doe", is_org: true, org_name: "Acme Foundation" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.is_org, true);
  assertEquals(body.org_name, "Acme Foundation");
});

Deno.test("constituent-create: an unset is_org/org_name is omitted, not sent as undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await constituentCreate.execute({ first_name: "Ada", last_name: "Lovelace" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("is_org" in body, false);
  assertEquals("org_name" in body, false);
});
