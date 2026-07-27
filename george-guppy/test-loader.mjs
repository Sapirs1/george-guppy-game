import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier.endsWith('.js') &&
      context.parentURL &&
      context.parentURL.includes('/george-guppy/src/')
    ) {
      return nextResolve(specifier.replace(/\.js$/, '.ts'), context);
    }
    return nextResolve(specifier, context);
  },
});
