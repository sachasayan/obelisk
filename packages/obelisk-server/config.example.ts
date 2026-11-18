import type { MatrixOptions, RuntimeOptions } from 'rpi-led-matrix';

let config = {
  verbose: true,
  runServer: true,
  initPanel: false
};

const panel = config.initPanel ? require('rpi-led-matrix') as typeof import('rpi-led-matrix') : undefined;

const matrixOptions: MatrixOptions | null = panel ? {
  ...panel.LedMatrix.defaultMatrixOptions(),
  rows: 16,
  cols: 32,
  chainLength: 4,
  brightness: 50,
  rowAddressType: 2,
  multiplexing: 3,
  hardwareMapping: panel.GpioMapping.Regular,
  pwmLsbNanoseconds: 1500,
  pwmBits: 8,
  pixelMapperConfig: panel.LedMatrixUtils.encodeMappers(
    { type: panel.PixelMapperType.Rotate, angle: 180 }
  )
} : null;

const runtimeOptions: RuntimeOptions | null = panel ? {
  ...panel.LedMatrix.defaultRuntimeOptions(),
  gpioSlowdown: 4
} : null;

export { config, matrixOptions, runtimeOptions };
