
# Cagdas Cecen Portfolio Website

This repository holds the code for the portfolio website of Cagdas Cecen. It is hosted under [https://www.cagdascecen.com/](https://www.cagdascecen.com/).

[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)


## Project Structure

Inside of your project, you see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── Card.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │    └── index.astro
│   └── img/
│       └── cc.png
└── package.json
```

The `src` folder holds all code that is written to build the final website. Files in the `public` folder are just directly copied to the final build.

The folder `components` holds snippets that are reused across the website.

The `layouts` folder holds the general layout HTML that is used to build pages.

The folder `pages` holds the final pages of the website. All routes and urls are based on these files.

Images placed in the `img` folder are automatically converted to webp and optimizied in the final html build.


## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Making changes to the website

1. Change the relevant file in the `src` folder. 
2. Run `npm run build` to create a new build of the website. The final files are located in the `dist` folder.
3. Copy the final files from the `dist` folder to the web server (usually using an ftp client)

Since astro builds mainly static html files you can alternatively also directly 
change the html file in `dist` and copy this file to the webserver.

**WARNING**: This can go horribly wrong if you change class-names or the html structure. If you do that, stick to changes of pure text.
