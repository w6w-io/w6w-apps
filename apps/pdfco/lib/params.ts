import type { Param } from "@w6w/types";

/**
 * Shared param fragments. Every PDF.co conversion/edit endpoint repeats the
 * same half-dozen options (`url`, `async`, `name`, `expiration`, HTTP-auth for
 * the source URL, `password`, `profiles`) verbatim — these builders keep the
 * casing and defaults consistent with the vendor's own Markdown tables (see
 * `lib/client.ts`'s module doc for why the openapi.json casing cannot be
 * trusted). Each call returns a fresh object so no action can mutate a
 * shared instance.
 */

export function urlParam(hint?: string): Param {
  return {
    key: "url",
    label: "File URL",
    type: "string",
    required: true,
    hint: hint ??
      "Publicly reachable URL to the source file (or a PDF.co filetoken:// / temp-storage URL from a prior step).",
  };
}

export function asyncParam(): Param {
  return {
    key: "async",
    label: "Run in background",
    type: "boolean",
    default: false,
    advanced: true,
    hint: "For long-running jobs. Returns a jobId to poll with the Check Background Job action " +
      "instead of waiting for the result inline.",
  };
}

export function nameParam(defaultName?: string): Param {
  return {
    key: "name",
    label: "Output file name",
    type: "string",
    default: defaultName,
    advanced: true,
  };
}

export function expirationParam(): Param {
  return {
    key: "expiration",
    label: "Output link expiration (minutes)",
    type: "number",
    default: 60,
    advanced: true,
    hint: "How long the generated output link stays downloadable from PDF.co's temporary storage.",
  };
}

export function passwordParam(): Param {
  return {
    key: "password",
    label: "PDF password",
    type: "secret",
    advanced: true,
    hint: "Only needed if the source PDF is password-protected.",
  };
}

export function inlineParam(defaultValue = false): Param {
  return {
    key: "inline",
    label: "Return result inline",
    type: "boolean",
    default: defaultValue,
    hint: "When true, the result is returned in the response body. When false, a URL to the " +
      "generated output file is returned instead.",
  };
}

export function pagesParam(oneBased = false): Param {
  return {
    key: "pages",
    label: "Pages",
    type: "string",
    advanced: true,
    hint: oneBased
      ? '1-based page numbers/ranges, e.g. "1,2,5-10" or "3-". Leaving this empty is rejected by ' +
        "this endpoint — PDF.co requires it. Inverted indices (!1) are not supported here."
      : 'Comma-separated page indices/ranges, 0-based, e.g. "0,1,2-" or "1,2,3-7". Use "!0" for ' +
        "the last page. Leave empty for all pages.",
  };
}

export function httpAuthParams(): Param[] {
  return [
    {
      key: "httpusername",
      label: "Source URL HTTP username",
      type: "string",
      advanced: true,
      hint: "Only needed if the file URL itself requires HTTP Basic auth to fetch.",
    },
    {
      key: "httppassword",
      label: "Source URL HTTP password",
      type: "secret",
      advanced: true,
    },
  ];
}

export function profilesParam(): Param {
  return {
    key: "profiles",
    label: "Advanced profile options",
    type: "json",
    advanced: true,
    hint: "PDF.co's endpoint-specific advanced options object (OCR mode, encryption, output " +
      "format, …), passed through verbatim. See PDF.co's Profiles docs for the shape this " +
      "endpoint accepts.",
  };
}

/** Accept a `json`-typed param as either an already-parsed value or a string a caller typed. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}
