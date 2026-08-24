import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(
    keys.sort(),
    [
      "recording-list",
      "recording-get",
      "recording-transcript-get",
      "recording-transcript-download",
      "recording-download",
      "recording-upload-create",
      "recording-update",
      "recording-tag-add",
      "recording-tag-remove",
      "recording-share-user",
      "recording-unshare-user",
      "recording-share-team",
      "recording-unshare-team",
      "hook-create",
      "hook-list",
      "hook-delete",
      "user-list",
      "team-list",
      "meeting-type-list",
    ].sort(),
  );
  assertEquals(new Set(keys).size, keys.length);
});

Deno.test("index: covers every non-OAuth2, non-upload-bytes documented v2 operation", () => {
  assertEquals(app.actions.length, 19);
});

Deno.test("index: declares the api-key auth method", () => {
  assertEquals(app.auth?.map((a) => a.key), ["api-key"]);
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: every action declares a type, title, description and resource", () => {
  for (const action of app.actions) {
    assert(["read", "search", "perform", "control"].includes(action.type));
    assert(action.title.length > 0, `${action.key} has no title`);
    assert(action.description, `${action.key} has no description`);
    assert(action.resource, `${action.key} has no resource`);
  }
});

Deno.test("index: every action declares output fields", () => {
  for (const action of app.actions) {
    assert(action.output, `${action.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", action.key);
    }
  }
});

Deno.test("index: no action sets an auth header itself", () => {
  for (const action of app.actions) {
    assertEquals(
      /authorization/i.test(action.execute.toString()),
      false,
      `${action.key} mentions an auth header`,
    );
  }
});
