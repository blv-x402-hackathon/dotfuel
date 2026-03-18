import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          color: "#1f130c",
          background:
            "radial-gradient(circle at 10% 10%, rgba(199,90,46,0.22), transparent 44%), radial-gradient(circle at 90% 15%, rgba(12,122,92,0.16), transparent 38%), linear-gradient(160deg, #f7efe0 0%, #ead8bd 100%)"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            padding: "10px 16px",
            fontSize: 24,
            fontWeight: 700,
            background: "rgba(255, 250, 242, 0.85)"
          }}
        >
          DotFuel
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>Pay gas with any token</div>
          <div style={{ fontSize: 44, color: "#6b4e34" }}>Zero native balance required.</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#7f3217",
            fontSize: 28,
            fontWeight: 700
          }}
        >
          Built for Polkadot Hub TestNet
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
