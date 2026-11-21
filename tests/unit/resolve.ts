import { registerHooks } from 'node:module';

// Unit tests run on Node's own type stripping, not tsx: its source maps made
// Node's coverage count comments and partly covered lines as untested (#170).
// Node doesn't resolve the imports Vite does, so this adds what they leave
// out: `.ts`, `/index.ts`, and `src` for imports starting with `/`.

const src = new URL('../../src/', import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const local = /^\.{1,2}(\/|$)/.test(specifier);
    const alias = /^\/[a-z]/.test(specifier);

    if (!local && !alias) return nextResolve(specifier, context);

    const base = (
      alias
        ? new URL(`.${specifier}`, src)
        : new URL(specifier, context.parentURL)
    ).href.replace(/\/$/, '');

    for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
      try {
        return nextResolve(candidate, context);
      } catch {
        // Try the next one
      }
    }

    return nextResolve(specifier, context);
  }
});
