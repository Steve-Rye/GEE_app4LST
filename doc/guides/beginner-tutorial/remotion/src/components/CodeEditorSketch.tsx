import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { CODE_FONT_STACK, UI_FONT_STACK } from "../fonts";

export type SketchFile = {
  name: string;
  active?: boolean;
};

export type SketchLine = {
  text: string;
  tone?: "comment" | "keyword" | "code";
};

type CodeEditorSketchProps = {
  files: SketchFile[];
  lines: SketchLine[];
};

/**
 * 简化 Code Editor 示意：左文件列表 + 中间假代码，供后续步骤复用。
 */
export const CodeEditorSketch: React.FC<CodeEditorSketchProps> = ({
  files,
  lines,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        opacity: interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        }),
        fontFamily: UI_FONT_STACK,
      }}
    >
      <div
        style={{
          width: 380,
          padding: 18,
          backgroundColor: "#101722",
          borderRight: "1px solid #2b384a",
        }}
      >
        <div
          style={{
            marginBottom: 14,
            color: "#8b9cb3",
            fontSize: 16,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          Scripts
        </div>
        {files.map((file) => (
          <div
            key={file.name}
            style={{
              marginBottom: 8,
              padding: "10px 12px",
              borderRadius: 8,
              backgroundColor: file.active ? "rgba(88, 166, 255, 0.16)" : "transparent",
              borderLeft: file.active ? "3px solid #58a6ff" : "3px solid transparent",
              color: file.active ? "#e6edf3" : "#8b9cb3",
              fontSize: 18,
              fontFamily: CODE_FONT_STACK,
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </div>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          padding: "22px 28px",
          backgroundColor: "#0d121a",
        }}
      >
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            gap: 10,
          }}
        >
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "#243044",
              color: "#9fb0c7",
              fontSize: 16,
            }}
          >
            Run
          </div>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "#1a2230",
              color: "#6f8098",
              fontSize: 16,
            }}
          >
            Reset
          </div>
        </div>
        {lines.map((line, index) => (
          <div
            key={`${line.text}-${index}`}
            style={{
              marginBottom: 10,
              color:
                line.tone === "comment"
                  ? "#6a9955"
                  : line.tone === "keyword"
                    ? "#7eb6ff"
                    : "#d5deea",
              fontFamily: CODE_FONT_STACK,
              fontSize: 24,
              lineHeight: 1.45,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
};
