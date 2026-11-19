export const DISPLAY_NAMESPACE = '/display';
export const DISPLAY_FRAME = 'panel:frame';
export const DISPLAY_CAPABILITY = '/api/panel';

export interface PanelGeometry {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
}

export interface PanelFrame<Bytes> extends PanelGeometry {
  rgb: Bytes;
  sequence: number;
  brightness: number;
  mode: string;
}
