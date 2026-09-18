import "./index.css";
import { Composition } from "remotion";
import { Step1OpenScript } from "./Step1OpenScript";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Step1OpenScript"
        component={Step1OpenScript}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "步骤 1 · 打开脚本并确认登录",
          url: "code.earthengine.google.com/…",
          activeFile: "landsat_lst_analysis_ui.js",
        }}
      />
    </>
  );
};
