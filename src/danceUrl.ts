import type { Dance } from "./instructions/index";
import { DanceSchema } from "./instructions/index";

async function compress(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function danceToHash(dance: Dance): Promise<string> {
  const json = JSON.stringify(dance);
  const compressed = await compress(new TextEncoder().encode(json));
  // Use standard base64 with URL-safe characters to avoid encoding issues in fragment
  let base64 = btoa(String.fromCharCode(...compressed));
  // Make URL-safe: replace +/ with -_ and strip trailing =
  base64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base64;
}

export async function danceFromHash(
  hash: string,
): Promise<{ dance: Dance } | { error: string }> {
  try {
    // Restore standard base64 from URL-safe variant
    let base64 = hash.replace(/-/g, "+").replace(/_/g, "/");
    // Re-pad
    while (base64.length % 4 !== 0) base64 += "=";

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const decompressed = await decompress(binary);
    const json = new TextDecoder().decode(decompressed);
    const parsed: unknown = JSON.parse(json);
    const result = DanceSchema.safeParse(parsed);
    if (!result.success) {
      return { error: `Invalid dance data in URL: ${result.error.message}` };
    }
    return { dance: result.data };
  } catch (e) {
    return {
      error: `Failed to parse dance from URL: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
