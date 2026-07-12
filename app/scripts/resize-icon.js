const sharp = require('sharp');
const path = require('path');

const inputImagePath = path.join(__dirname, '../assets/LOGOsmall.png');
const outputImagePath = path.join(__dirname, '../assets/adaptive-icon.png');

async function resizeIcon() {
  try {
    // Read the original image
    const image = sharp(inputImagePath);
    const metadata = await image.metadata();

    console.log(`Original size: ${metadata.width}x${metadata.height}`);

    // Create a 1080x1080 canvas (standard adaptive icon size)
    // The safe zone is a circle of diameter 720px in the center.
    // We want our logo to fit comfortably within 720px, e.g., max 600px width/height.

    // Calculate aspect ratio
    const aspectRatio = metadata.width / metadata.height;
    
    let targetWidth, targetHeight;
    const maxSize = 600; // fits well inside the 720px safe zone

    if (metadata.width > metadata.height) {
      targetWidth = maxSize;
      targetHeight = Math.round(maxSize / aspectRatio);
    } else {
      targetHeight = maxSize;
      targetWidth = Math.round(maxSize * aspectRatio);
    }

    console.log(`Resizing logo to: ${targetWidth}x${targetHeight}`);

    // Resize the image to fit within the safe zone
    const resizedImageBuffer = await image
      .resize(targetWidth, targetHeight, { fit: 'contain' })
      .toBuffer();

    // Composite the resized image onto a 1080x1080 transparent canvas
    await sharp({
      create: {
        width: 1080,
        height: 1080,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: resizedImageBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(outputImagePath);

    console.log(`Created adaptive-icon.png at ${outputImagePath}`);
  } catch (error) {
    console.error('Error resizing icon:', error);
  }
}

resizeIcon();
