import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { clockFontCandidates } from '../../obelisk-server/modes/clock.index.ts';
import { fittedFontCandidates } from '../../obelisk-server/panel/text-layout.ts';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const local = path => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: local('./'),
  base: '/simulator/',
  publicDir: local('../public/'),
  plugins: [react(), {
    name: 'panel-fonts',
    resolveId(id) { if (id === 'virtual:panel-fonts') return '\0panel-fonts'; },
    load(id) {
      if (id !== '\0panel-fonts') return;
      const fonts = {};
      const names = new Set([...fittedFontCandidates, ...Object.values(clockFontCandidates).flat()]);
      for (const name of names) {
        const file = name + '.bdf';
        const path = local('../../obelisk-server/fonts/' + file);
        this.addWatchFile(path);
        const source = readFileSync(path, 'utf8');
        // The modes display ASCII. Keep the original metrics and glyph bitmaps they draw.
        const glyphs = Array.from(source.matchAll(/^STARTCHAR[^\n]*\n[\s\S]*?^ENDCHAR/gm), ([block]) => block)
          .filter(block => { const code = Number(/^ENCODING (\d+)/m.exec(block)?.[1]); return code >= 32 && code < 127; });
        const header = source.split(/^CHARS \d+/m)[0];
        fonts[name] = [header, 'CHARS ' + glyphs.length, ...glyphs, 'ENDFONT'].join('\n');
      }
      return 'export default ' + JSON.stringify(fonts);
    },
  }, {
    name: 'basis-texture-worker',
    generateBundle() {
      // Package Three's own worker as a file so only its transcoder gets a JIT-enabled CSP.
      const constants = ['EngineFormat', 'EngineType', 'TranscoderFormat', 'BasisFormat']
        .map(key => `const _${key} = ${JSON.stringify(KTX2Loader[key])};`);
      const transcoder = readFileSync(fileURLToPath(import.meta.resolve('three/addons/libs/basis/basis_transcoder.js')), 'utf8');
      const source = [...constants, transcoder, '(' + KTX2Loader.BasisWorker.toString() + ')();'].join('\n');
      this.emitFile({ type: 'asset', fileName: 'texture-worker.js', source });
    },
  }],
  resolve: { alias: {
    'socket.io-client': local('./connection.ts'),
    './billboard-inputs': local('./billboard-inputs.ts'),
  } },
  define: {
    'process.env.OBELISK_SUNLIGHT_LATITUDE': 'undefined',
    'process.env.OBELISK_SUNLIGHT_LONGITUDE': 'undefined',
    'process.env.OBELISK_SUNLIGHT_TIME_ZONE': 'undefined',
  },
  build: { outDir: local('../../../site/simulator/'), emptyOutDir: true },
});
