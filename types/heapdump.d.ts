declare module "heapdump" {
  function writeSnapshot(filename?: string): void;
  export = { writeSnapshot };
}
