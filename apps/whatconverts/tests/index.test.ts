import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";

Deno.test("app declares exactly one auth method (basic)", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "basic");
  assertEquals(app.auth?.[0].type, "basic");
});

Deno.test("app declares one health check (service)", () => {
  assertEquals(app.healthChecks?.length, 1);
  assertEquals(app.healthChecks?.[0].key, "service");
});

Deno.test("every action has a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assertEquals(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(key), true, `${key} is not kebab-case`);
  }
});

Deno.test("every action declares a type, title and params array", () => {
  for (const action of app.actions) {
    assertExists(action.title, `${action.key} missing title`);
    assertEquals(["read", "search", "perform"].includes(action.type), true, action.key);
    assertEquals(Array.isArray(action.params), true, `${action.key} missing params array`);
  }
});

Deno.test("every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", `${action.key} missing idempotent flag`);
    }
  }
});

Deno.test("app covers the documented WhatConverts resources", () => {
  const keys = new Set(app.actions.map((a) => a.key));
  for (
    const key of [
      "leads-list",
      "lead-get",
      "lead-create",
      "lead-update",
      "recording-get",
      "accounts-list",
      "account-get",
      "account-create",
      "account-update",
      "account-delete",
      "profiles-list",
      "profile-get",
      "profile-create",
      "profile-update",
      "profile-delete",
      "roles-list",
      "role-get",
      "tracking-numbers-list",
      "tracking-number-delete",
      "tracking-forms-list",
      "tracking-form-delete",
      "users-list",
      "user-get",
      "user-create",
      "user-update",
    ]
  ) {
    assertEquals(keys.has(key), true, `missing action ${key}`);
  }
  assertEquals(app.actions.length, 25);
});
