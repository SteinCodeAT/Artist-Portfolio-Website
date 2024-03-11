[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)


![Depyloment](https://github.com/SteinCodeAT/Artist-Portfolio-Website/actions/workflows/deploy.yml/badge.svg)


# Çağdaş Çeçen Portfolio Website

Welcome to the official repository for the [official portfolio website](https://www.cagdascecen.com/) of Çağdaş Çeçen, 
a visionary artist whose work spans various mediums and themes. This site is 
built with Astro, showcasing a modern, responsive design that highlights Çağdaş's artistic journey.


## About the artist
Çağdaş Çeçen is a Vienna based media artist.
Currently, his artistic practices focuses in the relationship between 
human movement, space and uncertainity and he is developing 
new ways of interaction between human and space by using synesthetic 
nature of Quantum Physics not just symbolic or inspirational way 
but as an active element in his artworks. 
His projects have been already presented in several countries: 
Austria, Italy, Poland, Greece, Bosnia and Herzegovina.


## Live Demo

Experience the portfolio in action: [cagdascecen.com](https://www.cagdascecen.com/)

## Project Structure

Inside of your project, you see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── StackItem.astro
│   │   └── ...
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   │   └── projects/
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
| `npm run format`          | Run prettier to format all files                 |


## Continuous Integration and Deployment

This repository leverages GitHub Actions to ensure seamless deployment:

- <strong>Release Process</strong>: Merging changes from any development branch into `main` or committing directly to `main` initiates the deployment pipeline. The main branch is automatically deployed to GitHub Pages, making the latest version of the website readily available.

## License

The code in this repository can be used as an inspiration or reference for your own developments. Copying this repository and just changing the contents or any form of substantial reproduction of parts are not permitted without prior written permission.
