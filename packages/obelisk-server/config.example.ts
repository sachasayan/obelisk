import type { MatrixOptions, RuntimeOptions } from 'rpi-led-matrix';

export const config = {
  verbose: true,
  runServer: true,
  initPanel: false,
};

export const panelOptions = {
  rows: 16,
  cols: 32,
  chainLength: 4,
  parallel: 1,
  brightness: 50,
  rowAddressType: 2,
  multiplexing: 3,
  pwmLsbNanoseconds: 1500,
  pwmBits: 8,
} satisfies Partial<MatrixOptions>;

export function getHardwareOptions(panel: typeof import('rpi-led-matrix')) {
  const matrixOptions: MatrixOptions = {
    ...panel.LedMatrix.defaultMatrixOptions(),
    ...panelOptions,
    hardwareMapping: panel.GpioMapping.Regular,
    pixelMapperConfig: panel.LedMatrixUtils.encodeMappers(
      { type: panel.PixelMapperType.Rotate, angle: 180 },
    ),
  };

  const runtimeOptions: RuntimeOptions = {
    ...panel.LedMatrix.defaultRuntimeOptions(),
    gpioSlowdown: 4,
  };

  return { matrixOptions, runtimeOptions };
}
