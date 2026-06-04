import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 20%, rgba(126,240,193,0.24), transparent 26%), linear-gradient(180deg, #09121f 0%, #0d1a2f 100%)",
        }}
      >
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: 34,
            border: "7px solid rgba(126,240,193,0.88)",
            background: "rgba(9, 22, 36, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 64,
              color: "#f4efe6",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            S
          </div>
        </div>
      </div>
    ),
    size
  );
}
