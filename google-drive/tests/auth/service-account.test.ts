import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { buildAssertion, exchangeJwtForToken } from "../../auth/service-account.ts";

Deno.test("service-account: manifest — fields + type + label", () => {
  assertEquals(auth.key, "service-account");
  assertEquals(auth.type, "custom");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assertEquals(keys, ["clientEmail", "privateKey", "delegatedEmail"]);
});

Deno.test("service-account: buildAssertion produces JWT header + claim set", () => {
  const { header, payload, signingInput } = buildAssertion(
    { clientEmail: "sa@proj.iam.gserviceaccount.com", privateKey: "PEM" },
    1_700_000_000,
  );
  assertEquals(signingInput, `${header}.${payload}`);

  const decodedHeader = JSON.parse(atob(header.replace(/-/g, "+").replace(/_/g, "/")));
  assertEquals(decodedHeader, { alg: "RS256", typ: "JWT" });

  const decodedPayload = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  assertEquals(decodedPayload.iss, "sa@proj.iam.gserviceaccount.com");
  assertEquals(decodedPayload.sub, "sa@proj.iam.gserviceaccount.com");
  assertEquals(decodedPayload.aud, "https://oauth2.googleapis.com/token");
  assertEquals(decodedPayload.scope, "https://www.googleapis.com/auth/drive");
  assertEquals(decodedPayload.iat, 1_700_000_000);
  assertEquals(decodedPayload.exp, 1_700_000_000 + 3600);
});

Deno.test("service-account: buildAssertion routes delegatedEmail into sub", () => {
  const { payload } = buildAssertion(
    {
      clientEmail: "sa@proj.iam.gserviceaccount.com",
      privateKey: "PEM",
      delegatedEmail: "user@example.com",
    },
    1_700_000_000,
  );
  const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  assertEquals(decoded.sub, "user@example.com");
});

Deno.test("service-account: exchangeJwtForToken POSTs form-encoded jwt-bearer grant", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "at-1", expires_in: 3600 } }]);
  const out = await exchangeJwtForToken(ctx, "hdr.pl.sig");

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://oauth2.googleapis.com/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  assertEquals(body.get("assertion"), "hdr.pl.sig");
  assertEquals(out.access_token, "at-1");
});

Deno.test("service-account: test surfaces the not-yet-implemented state clearly", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test(
    { credential: { clientEmail: "sa@x", privateKey: "PEM" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").toLowerCase().includes("not yet implemented"));
});
