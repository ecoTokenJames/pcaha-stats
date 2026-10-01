import { ImageResponse } from "next/og";
import { SEASON } from "@/lib/data";

export const alt = "PCAHA Stats — standings, player stats and league leaders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1e3a8a",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              background: "white",
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 52,
              fontWeight: 800,
            }}
          >
            PC
          </div>
          <div style={{ fontSize: 88, fontWeight: 800 }}>PCAHA Stats</div>
        </div>
        <div style={{ fontSize: 40, marginTop: 40, color: "#bfdbfe" }}>
          Standings, player stats &amp; league leaders
        </div>
        <div style={{ fontSize: 32, marginTop: 16, color: "#93c5fd" }}>
          {`${SEASON} season · updated daily`}
        </div>
      </div>
    ),
    size
  );
}
