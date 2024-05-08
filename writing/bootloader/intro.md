---
title: Writing a bootloader in Rust
subtitle: A "series" (it has two parts).
date: 2024-04-25
tags: software
layout: blogpost.njk
enableToc: true
---

When I was in undergrad, I took [an operating systems course.](https://student.cs.uwaterloo.ca/~cs350/W24/). This course was widely feared, but I actually quite enjoyed it. I spent the rest of undergrad chasing the dragon of bare metal programming, but, for understandable reasons, there aren't many courses by that description.

After I graduated, I realized that I could, in fact, learn things without being graded for them. Why not just write my own OS for fun?

I usually start new projects with a prolonged period of ~~procrastination~~ research. If you want to learn about OS programming, the premier place is the OSDev [forum](https://forum.osdev.org/) and [wiki](https://wiki.osdev.org/Expanded_Main_Page). Many thanks to the people who maintain that site.

I also decided I would use Rust, because there are two things I love in life: following trends, and sum types. If you want to learn about OS programming _in Rust_, [Philipp Opperman's OS tutorial](https://os.phil-opp.com/) is the place to be. His tutorial doesn't cover writing a bootloader, but his [implementation on GitHub](https://github.com/rust-osdev/bootloader) was the primary source for what I'll be writing about here. Thanks to Philipp and all the contributors on that repo.

## What is a bootloader?

One of the first things I learned during my ~~procrastination~~ research is that operating systems start in two parts:

- The bootloader, which runs first and has to setup the environment for
- The kernel, which does all the actual OS stuff you're probably thinking about: scheduling, files, syscalls, etc.

## Why is a bootloader?

Why can't we have the kernel setup its own environment? As you'll see throughout this, a freshly powered on computer is a special place with its own rules, which makes it hard to write a operating system there. The difference between the boot environment and the kernel environment is so large that the initialization code would, essentially, be a separate program anyway.

## Ok, but why are _you_ writing one?

A lot of the OS development tutorials/guides tell you not to write your own bootloader, for some very good reasons:

- There's not much innovation left in the space
- Several good bootloaders already exist, which you can use with your kernel
- Bootloader bugs can often masquerade as kernel bugs
- There are only around 80 years of your life, which are inexorably disappearing with each passing hour

My counterpoints:

- I wanted to learn how it worked
- I'm stubborn

You can guess which side won the argument.

That's about it. With the introduction out of the way, I'll see you in [part 1](/blog/bootloader/part-1).
