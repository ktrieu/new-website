const fs = require("fs");

const markdownItAnchor = require("markdown-it-anchor");
const markdownItContainer = require("markdown-it-container");
const tocPlugin = require("eleventy-plugin-toc");

const NOT_FOUND_PATH = "_site/404/index.html";

const notFoundMiddleware = (req, res) => {
  if (!fs.existsSync(NOT_FOUND_PATH)) {
    throw new Error(
      `Expected a \`${NOT_FOUND_PATH}\` file but could not find one. Did you create a 404.html template?`
    );
  }

  const content_404 = fs.readFileSync(NOT_FOUND_PATH);
  // Add 404 http status code in request header.
  res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
  // Provides the 404 content without redirect.
  res.write(content_404);
  res.end();
};

const formatBlogDate = (date) => {
  return date.toLocaleDateString("en-US", { timeZone: "UTC" });
};

const getDetailsRenderer = (md) => ({
  validate: (params) => {
    return params.trim().match(/^details\s+(.*)$/);
  },

  render: (tokens, idx) => {
    if (tokens[idx].nesting === 1) {
      // opening tag
      const title = tokens[idx].info.trim().match(/^details\s+(.*)$/)[1];
      return "<details><summary>" + md.utils.escapeHtml(title) + "</summary>\n";
    } else {
      // closing tag
      return "</details>\n";
    }
  },
});

module.exports = function (eleventyConfig) {
  eleventyConfig.addWatchTarget("static/");
  eleventyConfig.addPassthroughCopy("static/");

  // This is for the dev server only, NGINX will handle this for production
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function (err, bs) {
        bs.addMiddleware("*", notFoundMiddleware);
      },
    },
  });

  eleventyConfig.addNunjucksFilter("formatBlogDate", formatBlogDate);

  eleventyConfig.amendLibrary("md", (mdLib) => mdLib.use(markdownItAnchor));
  eleventyConfig.amendLibrary("md", (mdLib) =>
    mdLib.use(markdownItContainer, "details", getDetailsRenderer(mdLib))
  );

  eleventyConfig.addPlugin(tocPlugin, {
    tags: ["h1", "h2", "h3", "h4"],
    wrapper: "nav",
    wrapperClass: "toc",
    ul: false,
    flat: false,
  });
};
