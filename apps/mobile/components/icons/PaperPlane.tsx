import Svg, { Path } from "react-native-svg";
import { PAPER_PLANE_VIEWBOX, PAPER_PLANE_PATHS } from "@travyl/shared";
import { StyleProp, ViewStyle } from "react-native";

interface PaperPlaneProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function PaperPlane({ size = 24, color = "currentColor", style }: PaperPlaneProps) {
  return (
    <Svg
      viewBox={PAPER_PLANE_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={style}
    >
      {PAPER_PLANE_PATHS.map((d, i) => (
        <Path key={i} d={d} />
      ))}
    </Svg>
  );
}
