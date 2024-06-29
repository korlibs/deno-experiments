#!/usr/bin/env -S deno run --allow-all --unstable-webgpu --unstable-ffi

/*
console.log('test')

const PROT_NONE = 0x0
const PROT_READ = 0x1
const PROT_WRITE = 0x2
const PROT_EXEC = 0x4

const MAP_SHARED = 0x01
const MAP_PRIVATE = 0x02
const MAP_32BIT = 0x40


// https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/mmap.2.html
//const lib = Deno.dlopen("/System/Library/Frameworks/CoreData.framework/CoreData", {
const lib = Deno.dlopen("libc.dylib", {
//    "mmap": { parameters: ["pointer", 'isize', 'i32', 'i32', 'i32', 'isize'], result: 'pointer' },

    // https://linux.die.net/man/2/mmap
    "fopen": { parameters: ["pointer", "pointer"], result: 'pointer' }, 
    "fclose": { parameters: ["pointer"], result: 'i32' }, 
    "mmap": { parameters: ["pointer", 'isize', 'i32', 'i32', 'isize'], result: 'i32' },
    "munmap": { parameters: ["pointer", 'isize'], result: 'i32' },
})

//console.log(lib.symbols.mmap)

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const fileName = encoder.encode("test.txt");
const mode = encoder.encode("w+");

const filePtr = lib.symbols.fopen(fileName, mode);


const file = await Deno.open("test.txt", { write: true, create: true });
file.rid
//console.log(lib.symbols.munmap(null, 0))
*/

const libc = {
    linux: "libc.so.6",
    darwin: "libc.dylib",
    windows: "msvcrt.dll",
  }[Deno.build.os];
  
  if (!libc) {
    throw new Error(`Unsupported OS: ${Deno.build.os}`);
  }
  
  const lib = Deno.dlopen(libc, {
    fopen: { parameters: ["pointer", "pointer"], result: "pointer", },
    fileno: { parameters: ["pointer"], result: "i32", },
    fclose: {
      parameters: ["pointer"],
      result: "i32",
    },
    mmap: {
      parameters: ["pointer", "usize", "i32", "i32", "i32", "isize"],
      result: "pointer",
    },
    munmap: {
      parameters: ["pointer", "usize"],
      result: "i32",
    },
    write: {
      parameters: ["i32", "pointer", "usize"],
      result: "isize",
    },
  });
  
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const fileName = encoder.encode("test.txt");
  const mode = encoder.encode("w+");
  
  const PROT_READ = 0x1;
  const PROT_WRITE = 0x2;
  const PROT_EXEC = 0x4;
  const MAP_SHARED = 0x01;
  const MAP_PRIVATE = 0x02;

  // const error = new Deno.UnsafePointerView(ptr[0]).getCString();
  
  const filePtr = lib.symbols.fopen(Deno.UnsafePointer.of(fileName), Deno.UnsafePointer.of(mode));

  const fileFd = lib.symbols.fileno(filePtr)
  console.log(`fileFd: ${fileFd}`)
  
  if (filePtr.value === 0n) {
    console.error("Failed to open the file");
  } else {
    console.log("File opened successfully");
  
    //const fd = Deno.openSync("test.txt", { write: true, create: true });
  
    //const buffer = new ArrayBuffer(1024)
    //lib.symbols.write(fd, Deno.UnsafePointer.of(buffer), buffer.length);
  
    const byteLength = 1024
    const mappedPtr = lib.symbols.mmap(
        null,
        byteLength,
      PROT_READ | PROT_WRITE,
      MAP_SHARED | MAP_PRIVATE,
      fileFd,
      0
    );

    mappedPtr

    //console.log(Deno.UnsafePointer.value(Deno.UnsafePointer.of(buffer)))
    console.log(Deno.UnsafePointer.value(mappedPtr))
    const arrayBuffer = new Deno.UnsafePointerView(mappedPtr).getArrayBuffer(byteLength)

    //new Uint8Array(arrayBuffer)[0] = 42
  
    const result = lib.symbols.fclose(filePtr);
    if (result === 0) {
      console.log("File closed successfully");
    } else {
      console.error("Failed to close the file");
    }
  }