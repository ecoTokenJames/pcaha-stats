// Lets tests load the site's TypeScript files the way Next.js does: `@/x` means `src/x`, and an
// import may leave off `.ts`. Import this first, then load the files under test with `await import()`.
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SRC = pathToFileURL(path.resolve(import.meta.dirname, "../src") + "/").href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith("@/") ? new URL(specifier.slice(2), SRC).href : specifier;
    try {
      return nextResolve(target, context);
    } catch (err) {
      const local = /^(\.{1,2}\/|\/|file:)/.test(target);
      if (err?.code !== "ERR_MODULE_NOT_FOUND" || !local || path.extname(target)) throw err;
      for (const ext of [".ts", ".tsx"]) {
        try {
          return nextResolve(target + ext, context);
        } catch {
          // try the next one
        }
      }
      throw err;
    }
  },
});
