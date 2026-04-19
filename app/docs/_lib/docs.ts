import fs from 'fs/promises';
import path from 'path';

export type DocEntry = {
  id: string;
  slug: string;
  title: string;
  file: string;
};

export const DOCS: DocEntry[] = [
  { id: 'overview', slug: 'overview', title: 'Overview', file: 'index.mdx' },
  { id: 'quickstart', slug: 'quickstart', title: 'Quickstart', file: 'quickstart.mdx' },
  { id: 'agent-execute', slug: 'agent-execute', title: '/agent/execute', file: 'agent-execute.mdx' },
  { id: 'api', slug: 'api-reference', title: 'API Reference', file: 'api.mdx' },
  { id: 'security', slug: 'security', title: 'Security & Production', file: 'security.mdx' },
  { id: 'demo', slug: 'demo', title: 'Demo', file: 'demo.mdx' }
];

export async function resolveDocsRoot() {
  const candidateRoots = [
    path.resolve(process.cwd(), 'content', 'agent-api'),
    path.resolve(process.cwd(), '..', 'docs', 'agent-api')
  ];

  for (const root of candidateRoots) {
    try {
      await fs.access(root);
      return root;
    } catch {
      continue;
    }
  }

  throw new Error('Docs directory not found. Ensure docs/agent-api exists.');
}

export function stripFrontmatter(raw: string) {
  if (!raw.startsWith('---')) {
    return { content: raw, title: null as string | null };
  }

  const end = raw.indexOf('\n---', 3);
  if (end === -1) {
    return { content: raw, title: null as string | null };
  }

  const fm = raw.slice(3, end).trim();
  const content = raw.slice(end + 4).trim();
  const titleMatch = fm.match(/title:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : null;
  return { content, title };
}

export async function loadDocs() {
  const root = await resolveDocsRoot();
  const docs = await Promise.all(
    DOCS.map(async (doc) => {
      const raw = await fs.readFile(path.join(root, doc.file), 'utf8');
      const { content, title } = stripFrontmatter(raw);
      return { ...doc, content, title: title || doc.title };
    })
  );

  return docs;
}

export async function loadDocBySlug(slug: string) {
  const doc = DOCS.find((entry) => entry.slug === slug);
  if (!doc) return null;
  const root = await resolveDocsRoot();
  const raw = await fs.readFile(path.join(root, doc.file), 'utf8');
  const { content, title } = stripFrontmatter(raw);
  return { ...doc, content, title: title || doc.title };
}
