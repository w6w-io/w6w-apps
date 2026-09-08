import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports all 12 actions, one auth method, and one health check", () => {
  assertEquals(app.actions.length, 12);
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service"]);
});

Deno.test("index: every action key is unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9-]*$/.test(key), true, `"${key}" is not kebab-case`);
  }
});

Deno.test("index: every action declares execute and a valid type", () => {
  for (const action of app.actions) {
    assertExists(action.execute, `${action.key} is missing execute`);
    assertEquals(["read", "search", "perform", "control"].includes(action.type), true);
  }
});

Deno.test("index: perform actions declare `idempotent` explicitly", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} must declare idempotent`);
  }
});

Deno.test("index: covers every operation in the vendor's OAS document", () => {
  const keys = new Set(app.actions.map((a) => a.key));
  for (
    const key of [
      "get-user",
      "list-groups",
      "list-network-members",
      "check-network-access",
      "person-create",
      "person-update",
      "person-find",
      "person-custom-fields-list",
      "company-create",
      "company-update",
      "company-find",
      "company-custom-fields-list",
    ]
  ) {
    assertEquals(keys.has(key), true, `missing ${key}`);
  }
});

Deno.test("index: auth declares a required test hook and a sign hook", () => {
  const auth = app.auth?.[0];
  assertExists(auth?.test);
  assertExists(auth?.sign);
  assertEquals(auth?.type, "apiKey");
});
