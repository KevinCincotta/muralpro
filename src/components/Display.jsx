import React, { useEffect, useRef, useState } from "react";
import { getHomography, transformPoint, homographyToTransformMatrix } from "../utils/transformUtils";

function Display({
  initialImage,
  initialSelection,
  initialWallWidthFeet,
  initialImageDimensions,
  initialShowGrid,
  initialShowDesign,
  initialCornerOffsets,
}) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(initialImage);
  const [selection, setSelection] = useState(initialSelection);
  const [wallWidthFeet, setWallWidthFeet] = useState(initialWallWidthFeet || 20);
  const [imageDimensions, setImageDimensions] = useState(initialImageDimensions || { width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(initialShowGrid || false);
  const [showDesign, setShowDesign] = useState(initialShowDesign || true);
  const [cornerOffsets, setCornerOffsets] = useState(
    initialCornerOffsets || {
      upperLeft: { x: 0, y: 0 },
      upperRight: { x: 0, y: 0 },
      lowerLeft: { x: 0, y: 0 },
      lowerRight: { x: 0, y: 0 },
    }
  );

  const updateCanvas = (imgSrc, sel, offsets) => {
    console.log("updateCanvas called with:", { imgSrc, sel, offsets, showDesign, showGrid });

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not found");
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!sel) {
      console.warn("Selection is null, filling canvas with black");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const srcPoints = [
      [sel.x + offsets.upperLeft.x, sel.y + offsets.upperLeft.y],
      [sel.x + sel.width + offsets.upperRight.x, sel.y + offsets.upperRight.y],
      [sel.x + offsets.lowerLeft.x, sel.y + sel.height + offsets.lowerLeft.y],
      [sel.x + sel.width + offsets.lowerRight.x, sel.y + sel.height + offsets.lowerRight.y],
    ];
    const dstPoints = [[0, 0], [1920, 0], [0, 1080], [1920, 1080]];
    console.log("Source points:", srcPoints);
    console.log("Destination points:", dstPoints);

    const H = getHomography(srcPoints, dstPoints);
    console.log("Homography matrix H:", H);

    if (showDesign && imgSrc) {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        console.log("Image loaded successfully with dimensions:", img.width, "x", img.height);
        console.log("Drawing image with source coordinates:", { x: sel.x, y: sel.y, width: sel.width, height: sel.height });
        drawPerspectiveImage(ctx, img, H, sel);
        if (showGrid) {
          console.log("Drawing grid");
          drawTransformedGrid(ctx, sel, H);
        }
      };
      img.onerror = (err) => {
        console.error("Image failed to load:", err);
        // Fallback: Draw a red rectangle to confirm canvas is working
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, 1920, 1080);
      };
    } else {
      console.log("No image to draw, filling with black");
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (showGrid) {
        console.log("Drawing grid without image");
        drawTransformedGrid(ctx, sel, H);
      }
    }
  };

  const drawPerspectiveImage = (ctx, img, H, sel) => {
    ctx.save();
    const transform = homographyToTransformMatrix(H);
    console.log("Transform matrix:", transform);
    if (transform.some(val => !isFinite(val))) {
      console.warn("Invalid transform, drawing without transform");
      // Draw the image from the selected region, adjusted to the canvas size
      ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, 1920, 1080);
    } else {
      // Apply the homography transform
      ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
      ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, 1920, 1080);
    }
    ctx.restore();
  };

  const drawTransformedGrid = (ctx, sel, H) => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      console.warn("Image dimensions are zero, skipping grid");
      return;
    }

    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;
    const majorGridSpacingPixels = 4 * pixelsPerFoot;
    const minorGridSpacingPixels = 1 * pixelsPerFoot;

    ctx.strokeStyle = "white";

    ctx.lineWidth = 4;
    for (let x = Math.floor(sel.x / majorGridSpacingPixels) * majorGridSpacingPixels; x <= sel.x + sel.width; x += majorGridSpacingPixels) {
      if (x >= sel.x && x <= sel.x + sel.width) {
        const top = transformPoint([x, sel.y], H);
        const bottom = transformPoint([x, sel.y + sel.height], H);
        console.log(`Vertical grid line at x=${x}: top=${top}, bottom=${bottom}`);
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(bottom[0], bottom[1]);
        ctx.stroke();
      }
    }

    for (let y = Math.floor(sel.y / majorGridSpacingPixels) * majorGridSpacingPixels; y <= sel.y + sel.height; y += majorGridSpacingPixels) {
      if (y >= sel.y && y <= sel.y + sel.height) {
        const left = transformPoint([sel.x, y], H);
        const right = transformPoint([sel.x + sel.width, y], H);
        console.log(`Horizontal grid line at y=${y}: left=${left}, right=${right}`);
        ctx.beginPath();
        ctx.moveTo(left[0], left[1]);
        ctx.lineTo(right[0], right[1]);
        ctx.stroke();
      }
    }

    ctx.lineWidth = 2;
    for (let x = Math.floor(sel.x / minorGridSpacingPixels) * minorGridSpacingPixels; x <= sel.x + sel.width; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0 && x >= sel.x && x <= sel.x + sel.width) {
        const top = transformPoint([x, sel.y], H);
        const bottom = transformPoint([x, sel.y + sel.height], H);
        console.log(`Minor vertical grid line at x=${x}: top=${top}, bottom=${bottom}`);
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(bottom[0], bottom[1]);
        ctx.stroke();
      }
    }

    for (let y = Math.floor(sel.y / minorGridSpacingPixels) * minorGridSpacingPixels; y <= sel.y + sel.height; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0 && y >= sel.y && y <= sel.y + sel.height) {
        const left = transformPoint([sel.x, y], H);
        const right = transformPoint([sel.x + sel.width, y], H);
        console.log(`Minor horizontal grid line at y=${y}: left=${left}, right=${right}`);
        ctx.beginPath();
        ctx.moveTo(left[0], left[1]);
        ctx.lineTo(right[0], right[1]);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    const channel = new BroadcastChannel("muralpro");
    channel.onmessage = (event) => {
      const { image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign, cornerOffsets } = event.data;
      console.log("BroadcastChannel message received:", event.data);
      setImage(image);
      setSelection(selection || null);
      if (wallWidthFeet) setWallWidthFeet(wallWidthFeet);
      if (imageDimensions) setImageDimensions(imageDimensions);
      if (showGrid !== undefined) setShowGrid(showGrid);
      if (showDesign !== undefined) setShowDesign(showDesign);
      if (cornerOffsets) setCornerOffsets(cornerOffsets);
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    console.log("useEffect triggered with state:", { image, selection, cornerOffsets });
    if (image && selection) {
      updateCanvas(image, selection, cornerOffsets);
    } else if (image || !showDesign) {
      updateCanvas(null, selection, cornerOffsets);
    } else {
      console.warn("No image or selection, skipping canvas update");
      // Draw a blue rectangle to confirm canvas is working
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, 1920, 1080);
      }
    }
  }, [image, selection, showGrid, showDesign, wallWidthFeet, imageDimensions, cornerOffsets]);

  return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh", objectFit: "cover" }} />;
}

export default Display;