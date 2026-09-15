import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HorrorScope — Your stars are screaming",
    short_name: "HorrorScope",
    description: "Horror-comedy horoscopes personalized to your birth date. Fictional entertainment only.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B14",
    theme_color: "#0B0B14",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
