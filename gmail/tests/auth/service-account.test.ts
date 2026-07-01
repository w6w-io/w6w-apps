import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";

Deno.test("service-account: declares expected shape and required fields", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "custom");
  const fieldKeys = (auth.fields ?? []).map((f) => f.key);
  assertEquals(fieldKeys, ["email", "privateKey", "delegatedEmail"]);
  // Impersonation is required for Gmail since service accounts have no mailbox.
  assertEquals(auth.fields?.find((f) => f.key === "delegatedEmail")?.required, true);
});

Deno.test("service-account: sign attaches Bearer when accessToken is present", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://gmail.googleapis.com/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "sa-token" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer sa-token");
});

Deno.test("service-account: sign is a no-op when the token isn't cached yet", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://gmail.googleapis.com/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: {} }, ctx);
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("service-account: exchange fails loudly while RS256 signer is a stub", async () => {
  // The stub in signRs256 rejects; the whole exchange must surface a TODO(rs256)-style error
  // rather than silently mint a bogus token.
  const { ctx } = mockCtx();
  const err = await assertRejects(
    () =>
      Promise.resolve(
        auth.exchange!(
          {
            fields: {
              email: "svc@project.iam.gserviceaccount.com",
              privateKey: "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----",
              delegatedEmail: "user@example.com",
            },
          },
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("RS256"));
});

Deno.test("service-account: test reports missing accessToken without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("service-account: test hits /users/me/profile with the cached token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { emailAddress: "u@x.com" } }]);
  const result = await auth.test({ credential: { accessToken: "cached" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/gmail/v1/users/me/profile");
  assertEquals(calls[0].headers["authorization"], "Bearer cached");
});
