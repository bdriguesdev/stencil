import { BUILD } from '@app-data';

import type * as d from '../declarations';
import { consoleDevError, consoleError } from './client-log';

export const cmpModules = /*@__PURE__*/ new Map<string, { [exportName: string]: d.ComponentConstructor }>();

/**
 * We need to separate out this prefix so that Esbuild doesn't try to resolve
 * the below, but instead retains a dynamic `import()` statement in the
 * emitted code.
 *
 * See here for details https://esbuild.github.io/api/#glob
 */
const MODULE_IMPORT_PREFIX = './';

export const loadModule = (
  cmpMeta: d.ComponentRuntimeMeta,
  hostRef: d.HostRef,
  hmrVersionId?: string,
): Promise<d.ComponentConstructor> | d.ComponentConstructor => {
  // loadModuleImport
  const exportName = cmpMeta.$tagName$.replace(/-/g, '_');
  const bundleId = cmpMeta.$lazyBundleId$;
  if (BUILD.isDev && typeof bundleId !== 'string') {
    consoleDevError(
      `Trying to lazily load component <${cmpMeta.$tagName$}> with style mode "${hostRef.$modeName$}", but it does not exist.`,
    );
    return undefined;
  }
  const module = !BUILD.hotModuleReplacement ? cmpModules.get(bundleId) : false;
  if (module) {
    return module[exportName];
  }
  /*!__STENCIL_STATIC_IMPORT_SWITCH__*/
  return import(
    /* @vite-ignore */
    /* webpackInclude: /\.entry\.js$/ */
    /* webpackExclude: /\.system\.entry\.js$/ */
    /* webpackMode: "lazy" */
    `${MODULE_IMPORT_PREFIX}${bundleId}.entry.js${BUILD.hotModuleReplacement && hmrVersionId ? '?s-hmr=' + hmrVersionId : ''}`
  ).then((importedModule) => {
    if (!BUILD.hotModuleReplacement) {
      cmpModules.set(bundleId, importedModule);
    }
    return importedModule[exportName];
  }, consoleError);
};
