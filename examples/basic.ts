import { MvsepClient, fileFromPath } from "../src/index.js";

const client = new MvsepClient({
  apiKeys: (process.env.MVSEP_API_KEYS ?? process.env.MVSEP_API_KEY ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean),
  region: "de",
  onProgress(event) {
    if (event.type === "poll") {
      const percent = event.fraction === undefined ? "" : ` ${Math.round(event.fraction * 100)}%`;
      console.error(`[mvsep] ${event.status}${percent}`);
    } else if (event.type === "retry") {
      console.error(`[mvsep] retrying in ${event.delayMs}ms: ${event.reason}`);
    }
  },
});

const result = await client.createAndWait({
  audiofile: await fileFromPath(process.argv[2] ?? "song.wav", "audio/wav"),
  sepType: 20,
  outputFormat: 1,
});

console.log(JSON.stringify(result.data?.files ?? [], null, 2));
