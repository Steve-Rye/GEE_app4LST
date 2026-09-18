import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { UI_FONT_STACK } from "../fonts";

/**
 * 步骤 1 验收点：右上角「已登录」角标轻弹簧弹出。
 */
export const LoggedInBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame,
    fps,
    config: {
      damping: 14,
      mass: 0.55,
      stiffness: 170,
    },
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 999,
        backgroundColor: "#12351f",
        border: "1px solid #3fb950",
        boxShadow: "0 10px 28px rgba(16, 42, 26, 0.45)",
        color: "#7ee787",
        fontFamily: UI_FONT_STACK,
        fontSize: 22,
        fontWeight: 700,
        opacity: interpolate(frame, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
        scale: pop,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 99,
          backgroundColor: "#3fb950",
        }}
      />
      已登录
    </div>
  );
};
