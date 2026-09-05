import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/bearer-token.ts";

Deno.test("bearer-token: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "bearer-token");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("bearer-token: sign sets Authorization: Bearer <key>", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer key-abc");
});

Deno.test("bearer-token: test hits GET /document_cards?page[number]=1 and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { document_cards: [], meta: {} } }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.pdfmonkey.io");
  assertEquals(url.pathname, "/api/v1/document_cards");
  assertEquals(url.searchParams.get("page[number]"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer key-abc");
});

Deno.test("bearer-token: test reports 401 with a specific message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ detail: "Unauthorized" }] } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("bearer-token: test reports failure with status code on other errors", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await auth.test({ credential: { apiKey: "key-abc" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

// Regression guard for the credential-echo risk documented in
// auth/bearer-token.ts's module doc: GET /current_user's sample response
// includes an `auth_token` field indistinguishable from the caller's own API
// key, so no CODE PATH in this app may call it. Scoped to actions/auth/lib —
// the only places a `ctx.fetch` call can live — so health/*.ts (declared
// `unavailable`, no `check` hook, nothing executable at all) is free to name
// the endpoint in its `unavailable.reason` string explaining why it's
// avoided. Comments are stripped too, so module docs can do the same.
Deno.test("bearer-token: current_user is never called from code (comments may name it)", async () => {
  const roots = ["actions", "auth", "lib"];
  for (const root of roots) {
    for await (
      const entry of Deno.readDir(new URL(`../../${root}`, import.meta.url))
    ) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const text = await Deno.readTextFile(new URL(`../../${root}/${entry.name}`, import.meta.url));
      const withoutComments = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      assertEquals(
        withoutComments.includes("current_user"),
        false,
        `${root}/${entry.name} must not call current_user in code (echoes the caller's API key)`,
      );
    }
  }
});
