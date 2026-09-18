import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { UI_FONT_STACK } from "../fonts";

type TutorialTitleProps = {
  children: React.ReactNode;
  animateIn?: boolean;
};

/**
 * 跟做教程步骤标题，后续步骤可复用。
 */
export const TutorialTitle: React.FC<TutorialTitleProps> = ({
  children,
  animateIn = true,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        fontFamily: UI_FONT_STACK,
        fontSize: 64,
        fontWeight: 700,
        color: "#f3f6fb",
        letterSpacing: 0.4,
        textAlign: "center",
        opacity: animateIn
          ? interpolate(frame, [0, 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })
          : 1,
        translate: animateIn
          ? interpolate(frame, [0, 14], ["0px 16px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })
          : "0px 0px",
      }}
    >
      {children}
    </div>
  );
};
