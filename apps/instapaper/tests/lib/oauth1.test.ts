import { assertEquals } from "@std/assert";
import { buildOAuth1Header, parseFormBody, percentEncode } from "../../lib/oauth1.ts";

Deno.test("oauth1: percentEncode escapes the RFC 3986 reserved set encodeURIComponent misses", () => {
  assertEquals(percentEncode("a b"), "a%20b");
  assertEquals(percentEncode("a!b*c'd(e)f"), "a%21b%2Ac%27d%28e%29f");
  assertEquals(percentEncode("abc-._~"), "abc-._~");
});

Deno.test("parseFormBody: reads an application/x-www-form-urlencoded body into an object", () => {
  assertEquals(parseFormBody("a=1&b=hello%20world"), { a: "1", b: "hello world" });
  assertEquals(parseFormBody(null), {});
  assertEquals(parseFormBody(undefined), {});
  assertEquals(parseFormBody(""), {});
});

/**
 * A signature computed independently in Python from the same inputs, using a
 * from-scratch RFC 5849 §3.4 implementation (percent-encode -> sort -> HMAC-
 * SHA1), rather than trusting a remembered published test vector. This is
 * the load-bearing test in this file: a base-string or signing-key mistake
 * here would still produce SOME signature — this is the only check that
 * catches producing the WRONG one.
 */
Deno.test("oauth1: buildOAuth1Header matches an independently computed HMAC-SHA1 signature", async () => {
  const header = await buildOAuth1Header(
    "POST",
    "https://api.twitter.com/1/statuses/update.json",
    { status: "Hello Ladies + Gentlemen, a signed OAuth request!", include_entities: "true" },
    {
      consumerKey: "xvz1evFS4wEEPTGEFPHBog",
      consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
      token: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
      tokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2oDaKfBWQ",
    },
    { nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", timestamp: "1318622958" },
  );

  assertEquals(
    header,
    'OAuth oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog", ' +
      'oauth_nonce="kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", ' +
      'oauth_signature="ZjP7hbc7Da8kGUWdXSST8am3JeQ%3D", ' +
      'oauth_signature_method="HMAC-SHA1", ' +
      'oauth_timestamp="1318622958", ' +
      'oauth_token="370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", ' +
      'oauth_version="1.0"',
  );
});

Deno.test("oauth1: two-legged (no token) omits oauth_token entirely", async () => {
  const header = await buildOAuth1Header(
    "POST",
    "https://www.instapaper.com/api/1/oauth/access_token",
    {
      x_auth_username: "alice@example.com",
      x_auth_password: "hunter2",
      x_auth_mode: "client_auth",
    },
    { consumerKey: "ck", consumerSecret: "cs" },
    { nonce: "fixednonce", timestamp: "1000000000" },
  );
  assertEquals(header.includes("oauth_token="), false);
  assertEquals(header.includes('oauth_consumer_key="ck"'), true);
});

Deno.test("oauth1: query string on the URL is excluded from the base string, per Instapaper's own POST-body-only rule", async () => {
  const withQuery = await buildOAuth1Header(
    "POST",
    "https://www.instapaper.com/api/1/folders/list?ignored=1",
    {},
    { consumerKey: "ck", consumerSecret: "cs", token: "tk", tokenSecret: "ts" },
    { nonce: "n", timestamp: "1" },
  );
  const withoutQuery = await buildOAuth1Header(
    "POST",
    "https://www.instapaper.com/api/1/folders/list",
    {},
    { consumerKey: "ck", consumerSecret: "cs", token: "tk", tokenSecret: "ts" },
    { nonce: "n", timestamp: "1" },
  );
  assertEquals(withQuery, withoutQuery);
});

Deno.test("oauth1: a different body produces a different signature", async () => {
  const creds = { consumerKey: "ck", consumerSecret: "cs", token: "tk", tokenSecret: "ts" };
  const a = await buildOAuth1Header(
    "POST",
    "https://www.instapaper.com/api/1/bookmarks/star",
    { bookmark_id: "1" },
    creds,
    { nonce: "n", timestamp: "1" },
  );
  const b = await buildOAuth1Header(
    "POST",
    "https://www.instapaper.com/api/1/bookmarks/star",
    { bookmark_id: "2" },
    creds,
    { nonce: "n", timestamp: "1" },
  );
  const sigOf = (h: string) => h.match(/oauth_signature="([^"]+)"/)?.[1];
  assertEquals(sigOf(a) !== sigOf(b), true);
});
