// Declare @react-three/fiber JSX intrinsic types for this directory.
// Placed alongside the 3D components so the augmentation is scoped.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ThreeElement, Object3DNode } from "@react-three/fiber";
import type * as THREE from "three";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      primitive: ThreeElement<any> & { object: object };
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      meshStandardMaterial: ThreeElement<any>;
      fogExp2: any;
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      primitive: ThreeElement<any> & { object: object };
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      meshStandardMaterial: ThreeElement<any>;
      fogExp2: any;
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      primitive: ThreeElement<any> & { object: object };
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      meshStandardMaterial: ThreeElement<any>;
      fogExp2: any;
    }
  }
}
