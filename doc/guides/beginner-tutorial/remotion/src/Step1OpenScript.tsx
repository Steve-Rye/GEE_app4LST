import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BrowserChrome } from "./components/BrowserChrome";
import { CodeEditorSketch } from "./components/CodeEditorSketch";
import { EmptyWorkspace } from "./components/EmptyWorkspace";
import { LoggedInBadge } from "./components/LoggedInBadge";
import { TutorialTitle } from "./components/TutorialTitle";
import { UI_FONT_STACK } from "./fonts";

export type Step1OpenScriptProps = {
  title: string;
  url: string;
  activeFile: string;
};

/**
 * 步骤 1：约 6 秒两拍。
 * 拍 1（0–84 帧 / 2.8s）标题 + 缩短 URL 打出；
 * 拍 2（84–180 帧 / 3.2s）简化编辑器 + 「已登录」角标弹出。
 */
export const Step1OpenScript: React.FC<Step1OpenScriptProps> = ({
  title,
  url,
  activeFile,
}) => {
  const frame = useCurrentFrame();
  const typedCount = Math.round(
    interpolate(frame, [18, 58], [0, url.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typedUrl = url.slice(0, typedCount);
  const caretOn = frame < 84 && (frame < 58 || Math.floor(frame / 10) % 2 === 0);
  const browserEnter = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const browserSlide = interpolate(frame, [8, 24], ["0px 18px", "0px 0px"], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0e1520",
        fontFamily: UI_FONT_STACK,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(88, 166, 255, 0.16), transparent 42%)",
        }}
      />
      <div
        style={{
          display: "flex",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          padding: "72px 96px 64px",
        }}
      >
        <TutorialTitle>
          <span style={{ color: "#7eb6ff" }}>步骤 1</span>
          <span style={{ color: "#8b9cb3" }}> · </span>
          {title.replace(/^步骤 1\s*·\s*/, "")}
        </TutorialTitle>
        <div
          style={{
            marginTop: 36,
            opacity: browserEnter,
            translate: browserSlide,
          }}
        >
          <BrowserChrome
            url={typedUrl}
            showCaret={caretOn}
            topRightSlot={
              <Sequence from={102} durationInFrames={78} name="已登录角标" layout="none">
                <LoggedInBadge />
              </Sequence>
            }
          >
            <Sequence durationInFrames={84} name="拍1 · 打开脚本">
              <EmptyWorkspace />
            </Sequence>
            <Sequence from={84} durationInFrames={96} name="拍2 · 确认登录">
              <CodeEditorSketch
                files={[
                  { name: activeFile, active: true },
                  { name: "landsat_lst_analysis.js" },
                  { name: "GEE_landsat_lst/" },
                ]}
                lines={[
                  { text: "// Landsat LST · 示意代码，非真实截图", tone: "comment" },
                  { text: "var roi = ee.Geometry.Point([104.06, 30.67]);", tone: "code" },
                  { text: "Map.centerObject(roi, 8);", tone: "keyword" },
                ]}
              />
            </Sequence>
          </BrowserChrome>
        </div>
      </div>
    </AbsoluteFill>
  );
};
