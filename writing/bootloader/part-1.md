---
title: Setting up a UEFI project in Rust
subtitle: Bootloader Pt. 1
date: 2024-04-25
tags: bootloader
layout: blogpost.njk
enableToc: true
---

Last time, in the [introduction](/writing/bootloader/intro) I went over what a bootloader actually does: namely transitioning from the default environment provided at boot time, to an environment suited for an operating system kernel to run on.

In this post, we'll go deeper into what that default boot environment is like, and also get some code running.

## UEFI

UEFI stands for Unified Extensible Firmware Interface, and it provides a standardized low-level interface for your bootloader to talk to the hardware. We’ll be using this to:

- Draw to the screen
- Get a map of how much memory the system has, and what it’s allocated to
- Read from the disk

The people (well, companies) who designed UEFI publish C files that allow you to call UEFI functions from C, but we’re using Rust. Since Rust can call C, “all” you have to do is painstakingly wrap the C function calls in Rust code and convert the API surface to be idiomatic Rust.

If that sounds like a lot of work, well, it does to me too. Luckily, it’s been done already by the good folks who make the [uefi-rs](https://github.com/rust-osdev/uefi-rs) library for Rust. That’ll be the main library we rely on today.

<details>
<summary>What about BIOS?</summary>

A lot of OS tutorials out there use the BIOS (Basic Input Output System), which is sort of like an older version of UEFI (hugely oversimplified). Like UEFI, the BIOS also offers a standardized mechanism to talk to your computer hardware. Unlike UEFI, it was invented two years before _Star Wars_ came out, and requires four steps to even reach the 64-bit mode modern computers run on.

These days, pretty much every computer there runs on UEFI only, and just emulates BIOS for compatibility with old software. Today, we'll just cut out the middleman and use UEFI directly.

</details>

## Starter code

With that out of the way, let’s setup our project. I’m going to assume anyone reading this knows Rust basics, so spin up a new Cargo binary project and add `uefi-rs` to your `Cargo.toml`.

Next, let’s write the starter code. Rust’s `main` function is designed to be called by your host OS, which won’t work since we’ll be booting directly into our program. Instead, `uefi-rs` has its own standard for what the main function looks like, which it will transform to be compatible with UEFI's C API.

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

I'll explain line by line:

`#![no_std]` tells Rust that it can’t use the default standard library, since that depends on an OS, which we don’t have. `#![no_main]` does something similar, telling Rust that there isn’t going to be a default `main` function.

The `#[entry]` attribute at the top of `uefi_main` marks your function as _the_ main function so `uefi-rs` knows where it is. This allows it to transform it like we mentioned above, and also check if you’ve declared it properly.

The UEFI main function takes two arguments: `_handle` is the UEFI handle of the “loaded image”, i.e., your program. `uefi-rs` uses it, but you won’t need it yourself.

The `system_table` gives you access to what UEFI calls services, which let you interact with the computer. For now, we'll just grab the console output service using `stdout()` , write a fun message, and unwrap the result. After printing, we `loop {}` so you can see the output instead of exiting immediately.

<details>
<summary>My VS Code is complaining about tests</summary>

That `no_std` will cause your VS Code Rust extension (if you use it) to complain about a missing “test” crate. Disable tests/benchmarks in your `Cargo.toml` to fix it. To do that, add this to the top of the file:

```toml
[[bin]]
name= "your-crate-name"
path = "src/main.rs"
test = false
bench = false
```

</details>

With the setup done, let's do a `cargo run` and see what happens. Will it work?

## Do panic

No.

```rust
error: `#[panic_handler]` function required, but not found

error: language item required, but not found: `eh_personality`
  |
  = note: this can occur when a binary crate with `#![no_std]` is compiled for a target where `eh_personality` is defined in the standard library
  = help: you may be able to compile for a target that doesn't need `eh_personality`, specify a target with `--target` or in `.cargo/config`
```

Makes sense - the default panic handler (printing the panic message to console) also requires OS support, which we've removed with our `no_std` statement. We can put together our own by adding a function with the required signature and adding the `#[panic_handler]` annotation to let Rust know about it.

```rust
#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    loop {}
}
```

There’s really nothing meaningful we can do here since we don’t even have access to the `system_table` to log a message. Such is low-level programming. I promise we’ll have something better here soon.

Let's add that and try `cargo run` again. Will this work?

## Targets

No.

```rust
found duplicate lang item `panic_impl`
the lang item is first defined in crate `std` (which `test` depends on)
first definition in `std` loaded from <your home dir>/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/...
second definition in the local crate (`loader_test`)
```

Our panic handler is colliding with the default implementation provided by Rust for Linux systems. Of course, we’re not even writing code for a Linux system.

The idea of “what system am I compiling for” is called a _target_ in Rust, and it’s usually determined by what system you’re running the compiler on. If you use a target that isn’t the current system, it’s called _cross-compiling_. This comes up pretty often in OS dev, since you’re (hopefully) writing your code on a computer that already has an operating system.

We have to tell Rust that we’re compiling for a UEFI target. Luckily, there’s one built in called `x86_64-unknown-uefi`. You can tell Rust to use it via adding a flag to your `cargo` commands:

```bash
cargo run --target x86_64-unknown-uefi
```

But, this is annoying to type and your IDE is going to complain about the `panic_handler` anyway, since _it_ doesn’t know you’re going to be adding that argument.

Instead, you can set a default target for your crate. Create `.cargo/config.toml` in your crate’s root directory and put this in it:

```bash
[build]
target = "x86_64-unknown-uefi"
```

(Using this method will cause us some annoying problems, but it’s the only way to do it. Consider this foreshadowing.)

Alright, now can we run it?

## The standard library

No.

```bash
error[E0531]: cannot find tuple struct or tuple variant `Ok` in this scope
   --> /home/<your user dir>/.cargo/registry/src/index.crates.io-6f17d22bba15001f/uguid-2.2.0/src/guid.rs:306:13
    |
306 |             Ok(g) => g,
    |             ^^ not found in this scope
(repeat 8 million times)
```

We’ve had an oversight: we told Rust there’s no standard library, but never provided anything to replace it. Some parts we can’t replace - file I/O, for example, requires OS support and so we can’t replicate it here. But that error is complaining about `Ok()` which is kind of universal, right? The platonic idea of being OK requires no OS support, presumably. Can we tell Rust we only want those parts?

We can, it turns out. For that, we need to jump back into that `.cargo/config.toml` file and add this:

```bash
[unstable]
build-std = ["core", "compiler_builtins"]
build-std-features = ["compiler-builtins-mem"]
```

These lines tell Rust to build the standard library from source for your target, including only the basics we need and can support. The line about `compiler-builtins-mem` tells Rust to use its built-in copies of functions like `memcpy` and friends. This needs to be explicitly enabled, because most platforms have their own versions which are better. Again, in UEFI land, we don't get much for free.

As the header says, this is unstable and requires we use Rust's nightly branch, so drop a `rust-toolchain.toml` in the root of your crate and put this in it:

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

There is one last thing we’ve forgotten about: We’re supposed to boot into this program, and our computer is already on. Unfortunately, `cargo run` won't be able to run our program at all.

You could, actually, stick your built executable on a USB drive and configure your computer to boot from it. I wouldn’t recommend it because:

- Copying your code onto a boot drive and waiting for your computer to reboot after a code change will be horrible
- Debugging on a computer that hasn’t even booted yet is horrible
- You might mess up your computer (horrible). I haven’t had this happen but my computer (and yours maybe) is pretty expensive. Best not to risk it.

Instead, we’re going to use a VM, which will pretend to be a UEFI-enabled computer while running sandboxed in a host OS. This fixes all our problems.

## QEMU

There are a few choices for this, but we’ll be using QEMU. This post is already getting pretty long, so I’ll let you figure out how to [install it](https://www.qemu.org/download/) on your system of choice. Come back once you’re done.

...

Ok, now that QEMU is installed, we need to load it with a UEFI implementation, that is, the code that implements the UEFI APIs we call. If you buy a real computer, this would be provided as firmware by the manufacturer of your motherboard. For QEMU, there is OVMF, an open-source implementation of the UEFI standard. You’ll need to get an image of the UEFI code (a `.fd` file) and then tell QEMU to use it.

On Linux, you can get OVMF via your package manager of choice. I'm going to assume you're using `apt` because I can never keep track of the other ones.

```bash
apt install ovmf
cp /usr/share/ovmf/OVMF.fd <your project dir>/ovmf/OVMF.fd
```

<details>
<summary>I’m not on Linux 😟</summary>

It’s ok, I wasn’t either when I was first doing this. I use Windows Subsystem for Linux now, which has the good parts of Linux (development tools) without the bad parts (everything else). If you don’t have access to a package manager there are pre-built binaries [here](https://www.kraxel.org/repos/). They’re old, but it doesn’t really matter for what we're doing. It’s frankly mystifying exactly which file you need, so just download [this one.](https://www.kraxel.org/repos/jenkins/edk2/edk2.git-ovmf-x64-0-20220719.209.gf0064ac3af.EOL.no.nore.updates.noarch.rpm)

It’s an `.rpm` so you’ll have to unpack it (7Zip works). Then, you want `/usr/share/edk2.git/ovmf-64/OVMF-pure-efi.fd` inside the archive. Take that file, and copy it to `/ovmf/OVMF.fd` in your project directory. Please rejoin the blog post in the next sub-heading.

</details>

## Boot image

Finally, how do we tell QEMU to boot into your program? A UEFI system will run whatever's at `/EFI/BOOT/BOOTx64.EFI` automatically on boot. QEMU lets you mount directories to the virtual machine, so we need to prepare a little boot volume. Make a new folder `bootimg` in your project directory and copy your executable into the right folder:

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

![Success!](/static/writing/bootloader/part-1/success.png)

Yeah, there’s an error message, but we did it!

Next time: we’ll write some actual code. See you in the next post.
