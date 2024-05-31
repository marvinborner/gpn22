# GPN22

Minimal reference implementation for my introductory talk about lambda
calculus.

`language.js` defines a small (\~200LOC) node.js interpreter for `.gpn`
files.

## Usage

-   `cat std.gpn <file> | node language.js`
-   e.g. `cat std.gpn samples/factorial.gpn | node language.js`

## Talk

-   Slides: `slides.pdf`
-   Related projects: [bruijn](https://bruijn.marvinborner.de),
    [lambda-screen](https://lambda-screen.marvinborner.de),
    [infinite-apply](https://infinite-apply.marvinborner.de)
