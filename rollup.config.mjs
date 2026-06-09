import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const h5Config = {
  input: 'src/h5/index.ts',
  output: [
    {
      file: 'dist/h5/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/h5/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/h5/index.umd.js',
      format: 'umd',
      name: 'AlipayBridge',
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist/h5',
      rootDir: './src/h5',
    }),
    terser(),
  ],
};

const miniprogramConfig = {
  input: 'src/miniprogram/index.ts',
  output: [
    {
      file: 'dist/miniprogram/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/miniprogram/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: './dist/miniprogram',
      rootDir: './src/miniprogram',
    }),
    terser(),
  ],
};

export default [h5Config, miniprogramConfig];
