import { SVGProps } from "react";
import { PAPER_PLANE_VIEWBOX, PAPER_PLANE_PATHS } from "@travyl/shared";

interface PaperPlaneProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function PaperPlane({ size = 24, className, ...props }: PaperPlaneProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={PAPER_PLANE_VIEWBOX}
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      {...props}
    >
      {PAPER_PLANE_PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
