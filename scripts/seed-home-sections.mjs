import fs from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://loveandflourbypooja.com';

function decodeHtmlEntities(text) {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const res = await fetch(`${SITE}/`, { headers: { 'user-agent': 'LoveAndFlourSeeder/1.0 (+local dev)' } });
  if (!res.ok) throw new Error(`Failed ${res.status} fetching homepage`);
  const html = await res.text();

  const testimonialMatches = [...html.matchAll(/<p[^>]*class="p1"[^>]*>\s*<em>([\s\S]*?)<\/em>\s*<\/p>/gi)];
  const testimonials = testimonialMatches
    .map((m) => stripTags(decodeHtmlEntities(m[1])))
    .filter(Boolean)
    .slice(0, 12)
    .map((quote, idx) => ({ id: String(idx + 1), quote }));

  const outDir = path.join(process.cwd(), 'src', 'data', 'seed');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'home-testimonials.json'), JSON.stringify(testimonials, null, 2));

  // eslint-disable-next-line no-console
  console.log(`Wrote ${testimonials.length} testimonials to ${outDir}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

