---
title: Setting up a UEFI project in Rust
subtitle: Bootloader Pt. 1
date: 2024-03-05
tags: secret
layout: blogpost.njk
---
First, some introductory stuff. We’re going to be using Rust, because I like it. I’ll leave it at that. The other bit of intro we need to cover is what exactly the “boot environment” I mentioned consists of.

## UEFI

UEFI stands for Unified Extensible Firmware Interface, and it provides a standardized low-level interface for your bootloader to talk to the hardware. We’ll be using this to:

- Draw to the screen
- Get a map of how much memory the system has, and what it’s allocated to
- Read from the disk

The people (well, companies) who designed UEFI publish C files that allow you to call UEFI functions from C, but we’re using Rust. Since Rust can call C, “all” you have to do is painstakingly wrap the C function calls in Rust code and convert the API surface to be idiomatic Rust. 

If that sounds like a lot of work, well it does to me too. Luckily, it’s been done already by the good folks who make the [uefi](https://github.com/rust-osdev/uefi-rs) library for Rust. That’ll be the main library we rely on today.

<details>
<summary>What about BIOS?</summary>

A lot of tutorials for OS stuff out there mention the BIOS, which is sort of like an older version of UEFI (hugely oversimplified). Like UEFI, the BIOS also offers a standardized mechanism to talk to your computer hardware. Unlike UEFI, it was invented two years before *Star Wars* came out, and requires four steps to even reach the 64-bit mode modern computers run on. UEFI drops you straight into it. UEFI is what every computer today is designed to support and is generally easier to work with. With that in mind, I’ll be sticking with UEFI today.
</details>

## Starter Code

With that out of the way, let’s setup our project. I’m going to assume anyone reading this knows Rust basics, so spin up a new Cargo project and add `uefi-rs` to your `Cargo.toml`.

Next, let’s write some simple code. Rust’s `main` function is designed to be called by your host OS, which won’t work since we’re writing a bootloader. UEFI has it’s own standard for the main function, so we’ll have to write it the way it wants (well, the way `uefi-rs` translates that standard into Rust). 

Your `main.rs` file will look like this:

```rust
#![no_std]
#![no_main]

#[entry]
fn uefi_main(_handle: Handle, mut system_table: SystemTable<Boot>) -> Status {
    system_table
        .stdout()
        .write_str("Hello world!")
        .unwrap();

    loop {}
}

```

That `no_std` at the top tells Rust that it can’t use the default standard library, since that depends on an OS, which we don’t have. The `no_main` does something similar, telling Rust that there isn’t going to be a default `main` function.

The UEFI main function takes two arguments: `_handle` is the UEFI handle of the “loaded image”, i.e., your program. `uefi-rs` uses it, but you won’t need it yourself.

The `system_table` gives you access to what UEFI calls services, which let you do things. So, we grab the console output service using `stdout()` , write a fun message, and unwrap the result.

After printing, we just `loop {}` so you can see the output instead of stalling immediately.

Finally, that `#[entry]` attribute at the top of `uefi_main` marks your function as *the* main function so `uefi-rs` knows where it is. This lets it do some setup work for you, and also check if you’ve declared it properly.

That `no_std` will cause your VS Code Rust extension (if you use it) to complain about a missing “test” crate. Disable tests/benchmarks in your `Cargo.toml` to fix it. 

Add this to the top of the file:

```rust
[[bin]]
name= "your-crate-name"
path = "src/main.rs"
test = false
bench = false
```

## Running It

Ok, nice, let’s run it. One `cargo run` later: 

```rust
error: `#[panic_handler]` function required, but not found

error: language item required, but not found: `eh_personality`
  |
  = note: this can occur when a binary crate with `#![no_std]` is compiled for a target where `eh_personality` is defined in the standard library
  = help: you may be able to compile for a target that doesn't need `eh_personality`, specify a target with `--target` or in `.cargo/config`
```

Makes sense - no standard library means no default panic handler. Let’s just throw one together.

```rust
#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    loop {}
}
```

There’s really nothing meaningful we can do here since we don’t even have access to the `system_table` to log a message. Such is low-level programming. I promise we’ll have something better here soon.

If you actually paste that into your file, though, you’ll get the following error:

```rust
found duplicate lang item `panic_impl`
the lang item is first defined in crate `std` (which `test` depends on)
first definition in `std` loaded from <your home dir>/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/...
second definition in the local crate (`loader_test`)
```

Our panic handler is colliding with the default implementation provided by Rust for Linux systems. Of course, we’re not even writing code for a Linux system. Let’s give Rust the good news.

## Targets

The idea of “what system am I compiling for” is called a *target* in Rust, and it’s usually determined by what system you’re on at the time. If you use a target that isn’t the current system, it’s called *cross-compiling*. This comes up pretty often in OS dev, since you’re (hopefully) writing your code on a computer that already has an operating system.

So, we have to tell Rust that we’re compiling for a UEFI target. Luckily, there’s one built in called `x86_64-unknown-uefi`. You can tell Rust to use it via adding a flag to your `cargo` commands:

```bash
cargo run --target x86_64-unknown-uefi
```

But, this is annoying to type and your IDE is going to complain about the `panic_handler` anyway, since *it* doesn’t know you’re going to be typing that.

Instead, you can set a default target for your crate. Create `.cargo/config.toml` in your crate’s root directory and put this in it:

```bash
[build]
target = "x86_64-unknown-uefi"
```

(Using this method will be surprisingly annoying, but it’s the only way to do it. Consider this foreshadowing.)

Alright, now can we run it?

## The Standard Library

No.

```bash
error[E0531]: cannot find tuple struct or tuple variant `Ok` in this scope
   --> /home/<your user dir>/.cargo/registry/src/index.crates.io-6f17d22bba15001f/uguid-2.2.0/src/guid.rs:306:13
    |
306 |             Ok(g) => g,
    |             ^^ not found in this scope
(repeat 8 million times)
```

We’ve had an oversight: we told Rust there’s no standard library, but never provided anything to replace it. Some parts we can’t replace - file I/O, for example, requires OS support and so we can’t replicate it here. But that error is complaining about `Ok()` which is kind of universal, right? The platonic idea of being OK. Can we tell Rust we only want those parts?

We can, it turns out. For that, we need to jump back into that `.cargo/config.toml` file and add this:

```bash
[unstable]
build-std = ["core", "compiler_builtins"]
build-std-features = ["compiler-builtins-mem"]
```

These lines tell Rust to build the standard library from source when building your project, including only the basics we need and can support. The line about `compiler-builtins-mem` tells Rust to use its built-in copies of functions like `memcpy` and friends. This needs to be explicitly enabled, because most platforms have their own versions which are better. 

As the header says, this is unstable and not in Rust’s stable branch, so drop a `rust-toolchain.toml` in the root of your crate and put this in it:

```bash
[toolchain]
channel = "nightly"
```

Ok, now can we run it?

## Running a UEFI binary

No.

```bash
target/x86_64-unknown-uefi/debug/loader-test.efi: Invalid argument
```

There is one last thing we’ve neglected: We’re supposed to boot into this program, and our computer is already on. Of course it won’t work.

You could, actually, stick your built executable on a USB drive and configure your computer to boot from it. I wouldn’t recommend it because:

- Copying your code onto a boot drive and waiting for your computer to reboot after a code change will be horrible
- Debugging on a computer that hasn’t even booted yet is horrible
- You might mess up your computer maybe? I haven’t had this happen but my computer is pretty expensive. Best not to risk it.

Instead, we’re going to use a VM, which will pretend to be a UEFI-enabled computer while running sandboxed in a host OS. This fixes all our problems. 

### QEMU

There are a few choices for this, but we’ll be using QEMU. This post is already getting pretty long, so I’ll let you figure out how to [install it](https://www.qemu.org/download/) on your system of choice. Come back once you’re done.

Ok, now that QEMU is installed, we need to get it UEFI compatible. UEFI itself needs code on the firmware side to work, for example, the code you (eventually) call when you call `.stdout().write()`. If you buy a real computer, the manufacturer writes that code.

For QEMU, there is OVMF, an open-source implementation of the UEFI standard. You’ll need to get an image of the UEFI code (a `.fd` file) and then tell QEMU to use it.

On Linux, you can get OVMF via your package manager:

```bash
apt install ovmf
cp /usr/share/ovmf/OVMF.fd <your project dir>/ovmf/OVMF.fd
```

<details>
<summary>I’m not on Linux 😟</summary>

It’s ok, I wasn’t either when I was first doing this. (I use WSL2 now). If you don’t have access to a package manager there are pre-built binaries [here](https://www.kraxel.org/repos/). They’re old, but it doesn’t really matter for this kind of thing. It’s frankly mystifying exactly which file you need, so just download [this one.](https://www.kraxel.org/repos/jenkins/edk2/edk2.git-ovmf-x64-0-20220719.209.gf0064ac3af.EOL.no.nore.updates.noarch.rpm) 

It’s an `.rpm` so you’ll have to unpack it (7Zip works). Then you want `/usr/share/edk2.git/ovmf-64/OVMF-pure-efi.fd` inside the archive. Take that file, and put it under `/ovmf/OVMF.fd` in your project directory. Please rejoin the blog post in the next sub-heading.
</details>

### Boot Image

Finally, how do we tell QEMU to boot into your program? By default, a UEFI system will run `/EFI/BOOT/BOOTx64.EFI` automatically on boot. QEMU lets you mount directories to the virtual machine, so we need to prepare a little boot volume. Make a new folder `bootimg` in your project directory and copy your executable into the right folder:

```bash
- <your project folder>
  - bootimg
    - EFI
      - BOOT
        - BOOTx64.efi (your executable, renamed)
```

And now at long last you can run QEMU with the right arguments, passing both the BIOS file you downloaded and the `bootimg/` folder you created:

```bash
qemu-system-x86_64 --bios ovmf/OVMF.fd -drive file=fat:rw:bootimg/,format=raw
```

![Success!](/static/blog/bootloader/part-1/success.png)

Yeah, there’s an error message, but we did it!

Next time: we’ll write some actual code. See you in the next post.