import { assertEquals } from "@std/assert";
import {
  buildContent,
  compact,
  formatManusError,
  toList,
  toSearchResult,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("toList: splits a comma-joined string and trims", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
});

Deno.test("toList: passes an array through, dropping blanks", () => {
  assertEquals(toList(["a", "", "b"]), ["a", "b"]);
});

Deno.test("toList: undefined/empty input yields undefined", () => {
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("toSearchResult: maps has_more/next_cursor onto { items, nextCursor }", () => {
  assertEquals(
    toSearchResult([{ id: 1 }], true, "cursor-2"),
    { items: [{ id: 1 }], nextCursor: "cursor-2" },
  );
});

Deno.test("toSearchResult: nextCursor is absent when has_more is false, even if a cursor is set", () => {
  const out = toSearchResult([], false, "stale-cursor");
  assertEquals(out.nextCursor, undefined);
});

Deno.test("toSearchResult: undefined items become an empty array", () => {
  assertEquals(toSearchResult(undefined, undefined, undefined), {
    items: [],
    nextCursor: undefined,
  });
});

Deno.test("buildContent: plain text with no file returns the string as-is", () => {
  assertEquals(buildContent("hello"), "hello");
});

Deno.test("buildContent: a file id builds a text + file ContentPart array", () => {
  const out = buildContent("hello", { fileId: "file-1" });
  assertEquals(out, [
    { type: "text", text: "hello" },
    { type: "file", file_id: "file-1" },
  ]);
});

Deno.test("buildContent: a file url with a filename omits unset fields", () => {
  const out = buildContent("hi", { fileUrl: "https://example.com/a.pdf", fileName: "a.pdf" });
  assertEquals(out, [
    { type: "text", text: "hi" },
    { type: "file", file_url: "https://example.com/a.pdf", filename: "a.pdf" },
  ]);
});

Deno.test("buildContent: no text but a file omits the text part", () => {
  const out = buildContent(undefined, { fileId: "file-1" });
  assertEquals(out, [{ type: "file", file_id: "file-1" }]);
});

Deno.test("formatManusError: surfaces the error envelope's code and message", () => {
  const raw = JSON.stringify({
    ok: false,
    request_id: "req_1",
    error: { code: "unauthenticated", message: "invalid api key" },
  });
  const msg = formatManusError(401, "GET", "/v2/agent.list", raw);
  assertEquals(msg, "Manus 401 unauthenticated for GET /v2/agent.list: invalid api key");
});

Deno.test("formatManusError: falls back to the raw body when it is not the error envelope shape", () => {
  const msg = formatManusError(502, "GET", "/v2/task.list", "upstream exploded");
  assertEquals(msg, "Manus 502 for GET /v2/task.list: upstream exploded");
});
