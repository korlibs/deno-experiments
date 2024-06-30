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

function strptr(str: string): Deno.PointerValue<unknown> {
  return Deno.UnsafePointer.of(new TextEncoder().encode(str + "\0"));
}

export class MemoryMappedFile {
  static lib: ReturnType<typeof MemoryMappedFile._genLib>

  arrayBuffer: ArrayBuffer;

  constructor(
    public filePtr: Deno.PointerValue<unknown>, 
    public fileFd: number,
    public mappedPtr: Deno.PointerValue<unknown>, 
    public size: number
  ) {
    this.arrayBuffer = new Deno.UnsafePointerView(mappedPtr).getArrayBuffer(size)
  }

  static _genLib() {
    const libc = ({
      linux: "libc.so.6",
      darwin: "libc.dylib",
      windows: "msvcrt.dll",
    } as any)[Deno.build.os];
      
    if (!libc) {
      throw new Error(`Unsupported OS: ${Deno.build.os}`);
    }
    
    return Deno.dlopen(libc, {
      fopen: { parameters: ["pointer", "pointer"], result: "pointer", },
      fileno: { parameters: ["pointer"], result: "i32", },
      fclose: { parameters: ["pointer"], result: "i32", },
      ftruncate: { parameters: ["i32", 'isize'], result: "i32", },
      //malloc: { parameters: ["usize"], result: "pointer", },
      //free: { parameters: ["pointer"], result: "void", },
      mmap: { parameters: ["pointer", "usize", "i32", "i32", "i32", "isize"], result: "pointer", },
      munmap: { parameters: ["pointer", "usize"], result: "i32", },
      //write: { parameters: ["i32", "pointer", "usize"], result: "isize", },
    });
  }
  static _getLib() {
    if (!MemoryMappedFile.lib) {
      MemoryMappedFile.lib = MemoryMappedFile._genLib();
    }

    return MemoryMappedFile.lib
  }

  static open(path: string, size: number): MemoryMappedFile {
    const PROT_READ = 0x1;
    const PROT_WRITE = 0x2;
    const PROT_EXEC = 0x4;
    const MAP_SHARED = 0x01;
    const MAP_PRIVATE = 0x02;
    const lib = MemoryMappedFile._getLib();

    const filePtr = lib.symbols.fopen(strptr(path), strptr("w+"));
    const fileFd = lib.symbols.fileno(filePtr);
    lib.symbols.ftruncate(fileFd, size);
    const mappedPtr = lib.symbols.mmap(
      null,
      size,
      PROT_READ | PROT_WRITE,
      MAP_SHARED,
      fileFd,
      0
    );
    return new MemoryMappedFile(filePtr, fileFd, mappedPtr, size);
  }

  close() {
    const lib = MemoryMappedFile._getLib();
    lib.symbols.munmap(this.mappedPtr, this.size);
    lib.symbols.fclose(this.filePtr);
  }
}

if (import.meta.main) {
  const mmapFile = MemoryMappedFile.open("test.txt", 1024)
  for (let n = 0; n < 1024; n++) {
    new Uint8Array(mmapFile.arrayBuffer)[n] = n * 1000
  }
  console.log(new Uint8Array(mmapFile.arrayBuffer)[101]);
  mmapFile.close();
}


/*
// const error = new Deno.UnsafePointerView(ptr[0]).getCString();

const byteLength = 16 * 1024

const filePtr = lib.symbols.fopen(strptr("test.txt"), strptr("w+"));
const fileFd = lib.symbols.fileno(filePtr)
lib.symbols.ftruncate(fileFd, byteLength);
console.log(`fileFd: ${fileFd}`)

if (Deno.UnsafePointer.value(filePtr) === 0n) {
  console.error("Failed to open the file");
  throw new Error("Failed to open the file");
}

console.log("File opened successfully");

//const fd = Deno.openSync("test.txt", { write: true, create: true });

//const buffer = new ArrayBuffer(1024)
//lib.symbols.write(fd, Deno.UnsafePointer.of(buffer), buffer.length);

//mmap(NULL, statInfo.st_size, PROT_READ, 0, fileDescriptor, 0);

const mappedPtr = lib.symbols.mmap(
  null,
  byteLength,
  PROT_READ | PROT_WRITE,
  MAP_SHARED | MAP_PRIVATE,
  //MAP_PRIVATE,
  //0,
  fileFd,
  0
);

if (Deno.UnsafePointer.value(mappedPtr) == -1n) {
  console.error("Failed to mmap the file");
  throw new Error("Failed to mmap the file");

}

mappedPtr
//console.log(Deno.UnsafePointer.value(Deno.UnsafePointer.of(buffer)))
console.log(Deno.UnsafePointer.value(mappedPtr))
const arrayBuffer = new Deno.UnsafePointerView(mappedPtr).getArrayBuffer(byteLength)
new Uint8Array(arrayBuffer)[0] = 42
console.log(new Uint8Array(arrayBuffer)[0]);

const mem = lib.symbols.malloc(1024)
const arrayBuffer2 = new Deno.UnsafePointerView(mem).getArrayBuffer(byteLength)
new Uint8Array(arrayBuffer2)[103] = 42
console.log(new Uint8Array(arrayBuffer2)[103]);
lib.symbols.free(mem);

lib.symbols.fclose(filePtr);
*/
