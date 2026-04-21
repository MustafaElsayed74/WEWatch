const { put } = require('@vercel/blob');

const token = "vercel_blob_rw_KnYfyYY3j7bNMGjA_CyUm2yPWiKl1SWzmp7iJGyV7SQ8hIO";

async function run() {
  try {
    const blob = await put('rooms/test-room.json', JSON.stringify({test: 1}), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
      token: token
    });
    console.log("Success:", blob);
  } catch(err) {
    console.error("Error:", err);
  }
}
run();
