import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { UI_FONT_STACK } from "../fonts";

/** 第 1 拍浏览器内容：空白工作区，把注意力留在标题和地址栏。 */
export const EmptyWorkspace: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        color: "#66768c",
        fontFamily: UI_FONT_STACK,
        fontSize: 28,
        opacity: interpolate(frame, [10, 24], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
      }}
    >
      打开脚本后将进入 Code Editor
    </div>
  );
};
