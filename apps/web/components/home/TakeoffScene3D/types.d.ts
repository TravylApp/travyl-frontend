/* eslint-disable @typescript-eslint/no-explicit-any */
// Type augmentation for R3F JSX elements used in this directory.
// These merge into JSX.IntrinsicElements without polluting existing HTML elements.
export {};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      primitive: any;
      ambientLight: any;
      directionalLight: any;
      fogExp2: any;
      meshStandardMaterial: any;
    }
  }
}
