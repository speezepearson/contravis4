import { parseArgs } from "node:util";

const { positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
});

const input = positionals[0];
if (!input) {
  console.error(
    "Usage: tsx scripts/fetch-contradb-dance.ts <contradb-url-or-id>",
  );
  process.exit(1);
}

const url = input.startsWith("http")
  ? input
  : `https://contradb.com/dances/${input}`;

const response = await fetch(url);
if (!response.ok) {
  console.error(
    `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
  );
  process.exit(1);
}

const html = await response.text();

const title = html.match(/<h1 class="dance-show-title">([^<]+)<\/h1>/)?.[1];
const author = html.match(
  /<p class="dance-show-choreographer">by: <strong><a [^>]*>([^<]+)<\/a><\/strong><\/p>/,
)?.[1];
const formation = html
  .match(/<p class="dance-show-formation">formation:\s*([^<]+)<\/p>/)?.[1]
  ?.trim();

console.log(`Title:     ${title}`);
console.log(`Author:    ${author}`);
console.log(`Formation: ${formation}`);
console.log();
console.log("Figures:");

const figureRowRe =
  /<td class=dance-show-beats>(\d+)<\/td>\s*<td><div class="show-figure">(.*?)<\/div>/g;

for (const match of html.matchAll(figureRowRe)) {
  const beats = match[1];
  const figure = match[2].replace(/<[^>]*>/g, "").replace(/&amp;/g, "&");
  console.log(`  ${beats.padStart(2)} beats  ${figure}`);
}
