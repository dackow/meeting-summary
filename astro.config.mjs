import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  integrations: [react(), sitemap(), tailwind()],
  server: { port: 3003 },
  adapter: node({
    mode: "standalone",
  }),
  experimental: {
    session: true,
  },
});
