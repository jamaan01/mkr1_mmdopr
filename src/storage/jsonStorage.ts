import fs from "node:fs";
import path from "node:path";

const directory = path.resolve("data");

export function readJson<T>(filename: string): T {
  const file = path.join(directory, filename);

  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

export function writeJson<T>(filename: string, data: T): void {
  const file = path.join(directory, filename);

  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}