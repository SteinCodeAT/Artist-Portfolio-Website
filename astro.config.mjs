import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import icon from "astro-icon";
import sitemap from '@astrojs/sitemap'
import compressor from "astro-compressor";

export default defineConfig({
  site: 'https://cagdascecen.com',
  base: '',
  integrations: [
    tailwind(),
    sitemap(),  
    icon(),
    compressor()
  ],
});
