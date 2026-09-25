declare module "node:path" {
  export function basename(path: string): string;
}

declare module "node:fs/promises" {
  export function readFile(path: string): Promise<Uint8Array>;
}


declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
};
