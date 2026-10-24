const fs = require('fs');
const path = require('path');

const dotNext = path.join(__dirname, '..', '.next');
if (fs.existsSync(dotNext)) {
  try {
    fs.rmSync(dotNext, { recursive: true, force: true });
    console.log('[Clean] Successfully removed stale .next directory.');
  } catch (err) {
    console.warn('[Clean] Note: Could not remove .next completely:', err.message);
  }
}
