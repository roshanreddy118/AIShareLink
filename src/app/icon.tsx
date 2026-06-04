import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
            width: 300,
            height: 300,
            borderRadius: 88,
            border: "12px solid rgba(126,240,193,0.88)",
            background: "rgba(9, 22, 36, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 24px 64px rgba(0,0,0,0.32)",
          }}
        >
          <div
            style={{
              fontSize: 168,
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
