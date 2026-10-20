import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "バレーコンディション",
    short_name: "バレコン",
    description: "バレーボール選手のためのコンディショニング記録アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f9f9f7",
    theme_color: "#1c5cab",
    lang: "ja",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
