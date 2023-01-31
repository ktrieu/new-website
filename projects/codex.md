---
title: Electoral Codex
tagline: Elections Visualization
photo: /static/projects/codex.png
links:
  - href: https://github.com/ktrieu/electoral-codex-web
    icon: "fa-brands fa-square-github"
  - href: https://codex.kevintrieu.com/
    icon: "fa-solid fa-link"
tags: projects
layout: project.njk
---

In the run-up to the 2019 Canadian election, I thought I'd discover my inner Nate Silver and try and build a model for the election. But, to build a model, you need data, and so I first wrote [some Python code](https://github.com/ktrieu/electoral-codex) to clean and extract the data Elections Canada gives you for past elections.

Then, I got distracted building this: a site that visualizes that data, providing vote percentages for every polling station in the country. It's a surprisingly interesting look into the political geography of the country. The charts are in D3 (with snazzy animations) and the maps are done using Mapbox.

I never ended up building that election model.
