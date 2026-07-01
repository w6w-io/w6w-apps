import { assertEquals } from "@std/assert";
import { subscriberHash } from "../../lib/subscriber-hash.ts";

Deno.test("subscriberHash: MD5 of lowercased email — known vectors", () => {
  // Reference values from Mailchimp docs / md5("").
  assertEquals(subscriberHash(""), "d41d8cd98f00b204e9800998ecf8427e");
  // md5("urist@mailchimp.com") — verified via md5sum.
  assertEquals(
    subscriberHash("urist@mailchimp.com"),
    "dab1b720e037477a678a4967ccc8f31f",
  );
});

Deno.test("subscriberHash: lowercases before hashing (Mailchimp requirement)", () => {
  assertEquals(
    subscriberHash("URIST@MAILCHIMP.COM"),
    subscriberHash("urist@mailchimp.com"),
  );
});
