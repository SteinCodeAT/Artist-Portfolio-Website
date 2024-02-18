import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from "astro-icon";
import sitemap from '@astrojs/sitemap'
import compressor from "astro-compressor";

export default defineConfig({
  site: 'https://steincodeat.github.io',
  base: '/Artist-Portfolio-Website',
  integrations: [
    tailwind(),
    sitemap(),  
    icon(),
    compressor()
  ],
});
