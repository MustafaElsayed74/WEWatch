const { put } = require('@vercel/blob');

const token = "vercel_blob_rw_KnYfyYY3j7bNMGjA_CyUm2yPWiKl1SWzmp7iJGyV7SQ8hIO";
const STORE_URL = 'https://knyfyyy3j7bnmgja.public.blob.vercel-storage.com';

async function run() {
  // Test WRITE
  console.log("Testing PUT...");
  const blob = await put('rooms/TESTROOM.json', JSON.stringify({
    videoUrl: "https://example.com/movie.mp4",
    isPlaying: false,
    time: 42,
    timestamp: Date.now()
  }), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    token: token
  });
  console.log("PUT success:", blob.url);

  // Test READ via direct URL
  console.log("\nTesting GET via direct URL...");
  const res = await fetch(`${STORE_URL}/rooms/TESTROOM.json?t=${Date.now()}`);
  const data = await res.json();
  console.log("GET success:", data);
}
run().catch(e => console.error("FAILED:", e));
