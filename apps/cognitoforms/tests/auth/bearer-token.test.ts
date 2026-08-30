import { assert, assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import { cfError, mockCtx } from "../_helpers.ts";
import auth from "../../auth/bearer-token.ts";

Deno.test("bearer-token: declares the bearer scheme", () => {
  assertEquals(auth.type, "bearer");
});

Deno.test("bearer-token: the credential field is a required secret", () => {
  const field = auth.fields?.find((f) => f.key === "accessToken");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
});

Deno.test("bearer-token: sign stamps the credential onto the Authorization header", () => {
  const request: SignableRequest = {
    url: "https://www.cognitoforms.com/api/forms",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!(
    { request, credential: { accessToken: "sekret" } },
    undefined as never,
  ) as SignableRequest;
  assertEquals(signed.headers["authorization"], "Bearer sekret");
});

Deno.test("bearer-token: test GETs /forms with the credential and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Id: "1", Name: "My Form" }] }]);
  const result = await auth.test({ credential: { accessToken: "good-token" } }, ctx);

  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/forms");
  assertEquals(calls[0].headers["authorization"], "Bearer good-token");
});

Deno.test("bearer-token: test fails on a genuinely invalid token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: cfError("AccessTokenInvalid", "AccessToken invalid.") },
  ]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "AccessToken invalid.");
});

Deno.test("bearer-token: test surfaces the vendor's own message for any other rejection", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: cfError("StorageLimitExceeded", "Storage limit exceeded.") },
  ]);
  const result = await auth.test({ credential: { accessToken: "some-token" } }, ctx);
  assertEquals(result, { ok: false, message: "Storage limit exceeded." });
});

Deno.test("bearer-token: test treats MissingScope as a live credential, not a dead one", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: cfError("MissingScope", "Scope authorization failed.", { MissingScope: "Form:Read" }),
    },
  ]);
  const result = await auth.test({ credential: { accessToken: "entry-only-token" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message?.includes("Form:Read"));
});

Deno.test("bearer-token: test fails fast when the credential has no accessToken", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result, { ok: false, message: "credential missing accessToken" });
  assertEquals(calls.length, 0);
});
