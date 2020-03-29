import { GpioMapping, LedMatrix, LedMatrixUtils, MatrixOptions, PixelMapperType, RuntimeOptions } from 'rpi-led-matrix';

let config = {
  runServer: true,
  initPanel: false
};


const matrixOptions: MatrixOptions | null = config.initPanel ? {
  ...LedMatrix.defaultMatrixOptions(),
  rows: 16,
  cols: 32,
  chainLength: 4,
  brightness: 50,
  rowAddressType: 2,
  multiplexing: 3,
  hardwareMapping: GpioMapping.Regular,
  pwmLsbNanoseconds: 1500,
  pwmBits: 8,
  pixelMapperConfig: LedMatrixUtils.encodeMappers(
    { type: PixelMapperType.Rotate, angle: 180 }
  )
} : null;

const runtimeOptions: RuntimeOptions | null = config.initPanel ? {
  ...LedMatrix.defaultRuntimeOptions(),
  gpioSlowdown: 4
} : null;

export { config, matrixOptions, runtimeOptions };