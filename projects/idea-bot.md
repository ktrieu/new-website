---
title: idea-bot
tagline: GPT Discord Bot
photo: /static/projects/idea-bot.png
links:
  - href: https://github.com/ktrieu/idea-bot
    icon: "fa-brands fa-square-github"
tags: projects
layout: project.njk
---

I wrote and edited for a publication at my university, [mathNEWS](https://mathnews.uwaterloo.ca). One of the most common questions you get from new people is "what do I write?". So, I thought I'd put together a bot for our Discord that uses GPT-3 to give you a suggestion.

It's the future, so the AI part was literally just some API calls, and the hard part was building a bot that stayed responsive on Discord while also handling long-running network requests. The solution was two Python processes and a message-passing system that I'm unreasonably proud of to this day.

In terms of non-technical achievements, I filled out the longest Google Form of my life to get this deployed, because OpenAI used to vet every public use of its API.

It's more of a novelty than an actual writing tool, but some people have actually gotten an article out of it.

(And of course, the bot named itself.)
