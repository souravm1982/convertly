# Reel Creation Feature

This document explains how to use the reel creation feature to generate MP4 videos from uploaded images.

## Overview

The reel creation feature allows you to combine multiple uploaded images into a single video with smooth fade transitions. Videos are automatically saved to your S3 bucket.

## How to Create a Reel

### Step 1: Upload Images
1. Use the upload section to select and upload 2 or more images
2. Wait for the upload to complete successfully
3. Your images will appear in the "Uploaded Images" section

### Step 2: Select Images for Reel
1. Click on the images you want to include in your reel
2. Selected images will be highlighted with a blue border
3. Each selected image shows a numbered badge indicating its position in the sequence
4. Click again to deselect an image

### Step 3: Configure Settings
1. Adjust the "Transition Duration" (0.5-3 seconds)
   - Shorter duration = faster transitions
   - Longer duration = smoother, slower transitions
   - Default: 1.5 seconds

### Step 4: Create the Reel
1. Click the "Create Reel" button
2. Wait while the video is being generated (this may take a few moments)
3. The reel will appear in the "Created Reels" section below
4. You can watch it directly in the browser or download from S3

## Technical Details

### Video Specifications
- **Resolution**: 1920x1080 (Full HD)
- **Format**: MP4 (H.264 codec)
- **Frame Rate**: 30 FPS
- **Aspect Ratio**: Images are scaled and padded to maintain aspect ratio
- **Quality**: CRF 23 (high quality, medium file size)
- **Transition Effect**: Fade transition between images

### File Storage
- Videos are stored in S3 under the `reels/` prefix
- Naming format: `reel-{timestamp}.mp4`
- Videos are publicly accessible if your bucket policy allows it

### Processing
The backend:
1. Downloads selected images from S3
2. Processes them with FFmpeg to create transitions
3. Generates the final video
4. Uploads the video back to S3
5. Cleans up temporary files
6. Returns the S3 URL for the video

## Use Cases

### Marketing Reels
Create product showcase videos from multiple product images with smooth transitions.

### Social Media Content
Generate Instagram/TikTok-style reels from a series of photos.

### Portfolio Presentations
Combine portfolio images into a professional video presentation.

### Event Highlights
Turn event photos into a shareable video highlight reel.

## Future Enhancements (Planned)

The following features are planned for future releases:

1. **Text Overlays**
   - Add custom text to each image
   - Configure font, size, color, and position
   - Animated text entrance/exit effects

2. **Background Music**
   - Upload and add background music to reels
   - Adjust volume and fade in/out

3. **Additional Transitions**
   - Slide, zoom, rotate transitions
   - Custom transition effects

4. **Advanced Timing Control**
   - Set different durations for each image
   - Pause on specific images

5. **Filters and Effects**
   - Apply color filters
   - Add vignette, blur, or other effects

6. **Video Templates**
   - Pre-configured styles and layouts
   - Aspect ratio options (vertical, square, horizontal)

7. **Batch Processing**
   - Create multiple reels at once
   - Queue system for large operations

## Tips for Best Results

1. **Image Quality**: Use high-resolution images (1920x1080 or higher)
2. **Aspect Ratios**: Images with similar aspect ratios work best together
3. **Image Count**: 3-7 images typically work well for most reels
4. **Transition Duration**: 
   - 1-1.5s for fast-paced content
   - 2-2.5s for slower, more dramatic transitions
5. **Image Order**: Click images in the order you want them to appear

## Troubleshooting

### Reel Creation Fails
- Ensure you have at least 2 images selected
- Check that all images are properly uploaded to S3
- Verify AWS credentials have read/write permissions
- Check browser console for detailed error messages

### Video Won't Play
- Ensure bucket policy allows public read access
- Try downloading and playing locally
- Check CORS configuration in S3

### Slow Processing
- Video generation typically takes 5-15 seconds per image
- Larger images or longer transitions take more time
- Processing happens on the server, so wait for completion

### Quality Issues
- Use images of similar resolution for consistency
- Avoid very small images (will be upscaled and may look pixelated)
- Ensure original images are high quality

## API Usage

If you want to programmatically create reels:

```javascript
const response = await fetch('/api/create-reel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    images: [
      { s3Key: 'image1.jpg', fileName: 'image1.jpg', /* ... */ },
      { s3Key: 'image2.jpg', fileName: 'image2.jpg', /* ... */ },
    ],
    transitionDuration: 1.5, // in seconds
  }),
});

const result = await response.json();
console.log(result.videoUrl); // S3 URL of the created reel
```

## Requirements

- FFmpeg (automatically installed via @ffmpeg-installer/ffmpeg)
- At least 2 uploaded images
- AWS S3 bucket with proper permissions
- Node.js server environment (not available in pure client-side)

## Credits

This feature uses:
- **FFmpeg**: Open-source video processing
- **fluent-ffmpeg**: Node.js FFmpeg wrapper
- **AWS SDK**: S3 integration
- **Next.js**: Server-side API routes