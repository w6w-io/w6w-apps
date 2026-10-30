// node --test .github/scripts/changed-apps.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { changedApps } from "./changed-apps.mjs";

const APPS = ["apps/2chat", "apps/google", "apps/google/gmail", "apps/zoho/zohodesk"];

test("a file inside an app selects that app only", () => {
  assert.deepEqual(changedApps(["apps/2chat/actions/send.ts"], APPS), ["apps/2chat"]);
});

test("a nested app wins over a parent directory that is also an app", () => {
  assert.deepEqual(changedApps(["apps/google/gmail/index.ts"], APPS), ["apps/google/gmail"]);
  assert.deepEqual(changedApps(["apps/google/index.ts"], APPS), ["apps/google"]);
});

test("a sibling directory with a shared prefix is not matched", () => {
  assert.deepEqual(changedApps(["apps/2chatter/index.ts"], APPS), []);
});

test("several files across apps are de-duplicated and sorted", () => {
  const files = ["apps/zoho/zohodesk/a.ts", "apps/2chat/b.ts", "apps/2chat/tests/c.test.ts"];
  assert.deepEqual(changedApps(files, APPS), ["apps/2chat", "apps/zoho/zohodesk"]);
});

test("shared files select ALL", () => {
  for (const f of [
    "w6w-pack.json",
    "package.json",
    "package-lock.json",
    "_tools/node-convert.mjs",
    "scripts/verify.sh",
    ".github/scripts/changed-apps.mjs",
    ".github/scripts/run-app-tests.mjs",
    ".github/workflows/reload-apps.yml",
  ]) {
    assert.equal(changedApps([f], APPS), "ALL", f);
  }
});

test("docs and other workflows select nothing", () => {
  assert.deepEqual(changedApps(["docs/publishing.md", ".github/workflows/ci.yml"], APPS), []);
});
