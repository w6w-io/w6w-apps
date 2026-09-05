import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/basic.ts";

const cred = {
  siteUrl: "https://example.com",
  username: "alice",
  password: "app pass word",
};
const expected = `Basic ${encodeBase64("alice:app pass word")}`;

Deno.test("basic: declares siteUrl / username / password, with the password secret", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assertEquals(keys, ["siteUrl", "username", "password"]);
  for (const f of auth.fields ?? []) assertEquals(f.required, true, f.key);
  assertEquals(auth.fields?.find((f) => f.key === "password")?.type, "secret");
});

Deno.test("basic: sign stamps a Basic header and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], expected);
});

Deno.test("basic: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("basic: test probes <site>/wp-json/frm/v3/forms with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "1": { name: "Contact" } } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://example.com/wp-json/frm/v3/forms");
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("basic: test honours a subdirectory install", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test({ credential: { ...cred, siteUrl: "https://site.com/blog/" } }, ctx);
  assertEquals(calls[0].url, "https://site.com/blog/wp-json/frm/v3/forms");
});

Deno.test("basic: test fails without a network call when a field is missing", async () => {
  for (const missing of ["siteUrl", "username", "password"]) {
    const credential: Record<string, string> = { ...cred };
    delete credential[missing];
    const { ctx, calls } = mockCtx();
    const result = await auth.test({ credential }, ctx);
    assertEquals(result.ok, false, missing);
    assertEquals(calls.length, 0, missing);
  }
});

Deno.test("basic: test explains a 404 as REST API being switched off", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Global Settings -> API"));
});

Deno.test("basic: test explains a 403 as a missing Formidable permission", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("View Forms List"));
});

Deno.test("basic: test surfaces the vendor's message on a 401", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "rest_forbidden", message: "Sorry, you are not allowed to do that." },
  }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Sorry, you are not allowed to do that.");
});

Deno.test("afterConnect: publishes a normalised siteUrl, host and username — no credential", async () => {
  const { ctx, calls } = mockCtx();
  const display = await auth.afterConnect!(
    { credential: { ...cred, siteUrl: "https://site.com/blog/wp-json/frm/v3/" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.siteUrl, "https://site.com/blog");
  assertEquals(display.username, "alice");
  assertEquals((display.site as { host: string }).host, "site.com");
  // Nothing about the password may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes("app pass word"), false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: leaves the host blank rather than guessing at a bad URL", async () => {
  const { ctx } = mockCtx();
  const display = await auth.afterConnect!(
    { credential: { siteUrl: "not a url", username: "alice" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals((display.site as { host: string }).host, "");
});
