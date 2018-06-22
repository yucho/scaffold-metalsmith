/**
 * JavaScript API for Metalsmith website generation
 *
 * @module scaffold-metalsmith
 */


/**
 * Dependencies
 */
// Lightweight static site generator
const metalsmith = require("metalsmith");

/**
 * Default options. Just modify values here. No need to separate config file.
 */
const opts = {
    "source": "src",
    "destination": "dest",
    "metadata": {
        "site": {
            "title": "yoursitetitle",
            "url": "https://yoursitehost.com"
        }
    }
}

/**
 * Website generation
 */
metalsmith(__dirname)
    .source(opts.source)
    .destination(opts.destination)
    .metadata(opts.metadata)

    // Run prebuild tasks such as processing inputs and metadata, adding
    // template helpers, launching a local server, etc.
    .use(prebuildTasks())

    // Concatenate some files to reduce the number of files and HTTP requests
    .use(concatenateFiles())

    // Minify concatenated CSS files and generate source map on dev env
    .use(minifyCSS())

    // Transpile and minify concatenated JS files with Babel and UglifyJS.
    // Generate source map on dev env
    .use(minifyJS())

    // Load partials into Metalsmith metadata
    .use(loadPartials())

    // Render nested layouts in correct order
    .use(renderLayouts())

    // Render all files using in-place engine
    .use(renderAll())

    // Generate sitemap and place it at document root for SEO
    .use(generateSitemap())

    .build(function(err) { if (err) throw err });


function prebuildTasks() {
    return require("./lib/prebuild.js")();
}

function concatenateFiles() {
    const concat = require("metalsmith-concat-convention");
    return concat({ extname: ".concat" });
}

function minifyCSS() {
    return function (files, metalsmith, done) {
        const minify = require("metalsmith-clean-css");
        const metadata = metalsmith.metadata();
        const opts = { files: ["src/scripts/**/*.css"] };

        // Generate source map in dev env
        if(metadata.portserve) Object.assign(opts, {sourceMap: true});

        minify(opts)(files, metalsmith, done);
    }
}

function minifyJS() {
    return function(files, metalsmith, done) {
        const metadata = metalsmith.metadata();
        const babel = require("metalsmith-babel");
        const babelOpts = {
            presets: [["env", {"targets": {
                "browsers": [ ">0.25%", "ie 11", "safari > 9" ]
            }}]],
            minified: true
        };
        // Generate source map in dev env
        if(metadata.portserve) {
            Object.assign(babelOpts, {sourceMaps: true});
        }
        const uglify = require("metalsmith-uglify");
        const uglifyOpts = { "sameName": true };
        // Don't generate source map in production env
        if(!metadata.portserve) Object.assign(uglifyOpts, {uglify: {sourceMap: false}});

        babel(babelOpts)(files, metalsmith);
        uglify(uglifyOpts)(files, metalsmith, done);
    }
}

function loadPartials() {
    const partials = require("metalsmith-partial");
    return partials({
        "directory": "./lib/partials",
        "engine": "eco"
    });
}

function renderLayouts() {
    const layouts = require("metalsmith-nestedlayouts");
    return layouts({
        "directory": "lib/layouts",
        "pattern": "**/*.@(eco|html)"
    });
}

function renderAll() {
    const inplace = require("metalsmith-in-place");
    return inplace();
}

function generateSitemap() {
    return function(files, metalsmith, done) {
        const sitemap = require("metalsmith-sitemap");
        const metadata = metalsmith.metadata();
        sitemap({ hostname: metadata.getRootURL() })(files, metalsmith, done);
    }
}
