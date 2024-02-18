
[![Built with Astro](https://astro.badg.es/v2/built-with-astro/small.svg)](https://astro.build)


# Çağdaş Çeçen Portfolio Website


This repository holds the code for the portfolio website of Çağdaş Çeçen
which is accessible under [https://www.cagdascecen.com/](https://www.cagdascecen.com/).


Çağdaş Çeçen is a Vienna based media artist who studied Media Art : 
Digital Art at University of Applied Arts Vienna and Physics at University 
of Vienna. Currently, his artistic practices focuses in the relationship between 
human movement, space and uncertainity. Since 2018 he is developing 
new ways of interaction between human and space by using synesthetic 
nature of Quantum Physics not just symbolic or inspirational way 
but as an active element in his artworks. 


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
| `npm run format`          | Run prettier to format all files      `          |

## Hosting

The website is hosted on github pages with the custom domain www.cagdascecen.com configured for it.

## Continuous Integration and Deployment

![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)

This repository leverages GitHub Actions to ensure seamless deployment:

- <strong>Release Process</strong>: Merging changes from any development branch into `main` or committing directly to `main` initiates the deployment pipeline. The main branch is automatically deployed to GitHub Pages, making the latest version of the website readily available.

## Making changes to the website

### General Changes 

1. Change the relevant file in the `src` folder. 
2. Run `npm run build` to create a new build of the website. The final files are located in the `dist` folder.
3. Copy the final files from the `dist` folder to the web server (usually using an ftp client)

Since astro builds mainly static html files you can alternatively also directly 
change the html file in `dist` and copy this file to the webserver.

**WARNING**: This can go horribly wrong if you change class-names or the html structure. If you do that, stick to changes of pure text.

### Adding a new project sub page

All projects (not just exhibitions) that are highlighted using a card in the project-section have a project sub-page in the folder `pages/projects/`. 

To add a new project:

1. Upload any images for the new project in `src/img`
2. create a new astro-file for your project sub-page and provide all necessary information and import the images.
3. Update the project-list in index.astro. Include relevant information and a fitting image.

### Adding a new exhibition

tbd
