import React from "react";
import { CODE_FONT_STACK, UI_FONT_STACK } from "../fonts";

type BrowserChromeProps = {
  url: string;
  showCaret?: boolean;
  tabLabel?: string;
  topRightSlot?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * 可复用浏览器壳：后续步骤可继续套用，不嵌真实截图。
 */
export const BrowserChrome: React.FC<BrowserChromeProps> = ({
  url,
  showCaret = false,
  tabLabel = "Earth Engine Code Editor",
  topRightSlot,
  children,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: 1520,
        height: 780,
        backgroundColor: "#151c27",
        border: "1px solid #2b384a",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 28px 80px rgba(0, 0, 0, 0.42)",
        fontFamily: UI_FONT_STACK,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: 52,
          padding: "0 18px",
          backgroundColor: "#1c2533",
          borderBottom: "1px solid #2b384a",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              backgroundColor: "#ff5f57",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              backgroundColor: "#febc2e",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 99,
              backgroundColor: "#28c840",
            }}
          />
        </div>
        <div
          style={{
            maxWidth: 360,
            padding: "6px 14px",
            borderRadius: "10px 10px 0 0",
            backgroundColor: "#243044",
            color: "#d5deea",
            fontSize: 18,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tabLabel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 56,
          padding: "0 18px",
          backgroundColor: "#121821",
          borderBottom: "1px solid #2b384a",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            backgroundColor: "#3fb950",
            boxShadow: "0 0 0 4px rgba(63, 185, 80, 0.18)",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            height: 36,
            padding: "0 14px",
            borderRadius: 8,
            backgroundColor: "#0d121a",
            border: "1px solid #334155",
            color: "#e6edf3",
            fontFamily: CODE_FONT_STACK,
            fontSize: 22,
            letterSpacing: 0.2,
          }}
        >
          <span>{url}</span>
          {showCaret ? (
            <span
              style={{
                width: 2,
                height: 20,
                marginLeft: 2,
                backgroundColor: "#7eb6ff",
              }}
            />
          ) : null}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 18,
          right: 22,
          zIndex: 3,
        }}
      >
        {topRightSlot}
      </div>

      <div
        style={{
          position: "relative",
          height: 672,
          backgroundColor: "#0d121a",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};
