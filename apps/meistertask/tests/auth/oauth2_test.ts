import { assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx, pathOf } from "../_helpers.ts";
import type { SignableRequest } from "@w6w/types";

Deno.test("oauth2: declares MindMeister's authorization/token endpoints and scopes", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://www.mindmeister.com/oauth2/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://www.mindmeister.com/oauth2/token");
  assertEquals(oauth2.oauth2?.scopes, ["userinfo.profile", "userinfo.email", "meistertask"]);
});

Deno.test("oauth2: sign injects the bearer header", async () => {
  const { ctx } = mockCtx();
  const request: SignableRequest = {
    url: "https://www.meistertask.com/api/projects",
    method: "GET",
    headers: {},
  };
  const signed = await oauth2.sign!({ request, credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("oauth2: test() probes GET /persons/me — same endpoint as the token method", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8 } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok-1" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/persons/me");
  assertEquals(result, { ok: true });
});

Deno.test("oauth2: test() fails fast when the credential is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
