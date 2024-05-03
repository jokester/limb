import * as esbuild from 'esbuild';
import debug from 'debug';
import fsp from 'node:fs/promises';

const logger = debug('sio-worker:build');

const result = await esbuild.build({
  bundle: true,
  platform: 'node',
  outfile: '/dev/null',
  treeShaking: true,
  metafile: true,
  // logLevel: 'verbose',
  entryPoints: ['src/index.ts'],
});

logger('esbuild result', result);

for (const [name, value] of Object.entries(result.metafile.inputs)) {
  const {imports, bytes} = value;
  // logger('input', name, value);

  for (const importee of value.imports) {
    if (
      [
        // 'events',
        // Uncaught TypeError: globalThis.XMLHttpRequest is not a constructor
        'http',
        'https',
        'crypto',
        'userver',
        'uws',
        'timer',
      ].includes(importee.path) ||
      ['ws'].some(path => !name.includes(path) && importee.path.includes(path))
    ) {
      console.warn(
        'dangerous import',
        JSON.stringify(importee.path),
        'in',
        name
      );
    }
  }
}

await fsp.writeFile(
  `esbuild-meta.json`,
  JSON.stringify(result.metafile, null, 2)
);
