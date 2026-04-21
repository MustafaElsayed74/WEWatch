const { put } = require('@vercel/blob');

const token = "vercel_blob_rw_8jOHIDjXT9PgEiEH_SEr9kvmc6JFBrFD74L1J8skGe1kWFJ";

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
