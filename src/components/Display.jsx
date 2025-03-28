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

  function offsetsAreZero(offsets) {
    return Object.values(offsets).every(corner => corner.x === 0 && corner.y === 0);
  }

  // Function to set canvas size based on parent container
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parentWidth = canvas.parentElement.clientWidth;
    const parentHeight = canvas.parentElement.clientHeight;
    const aspectRatio = 16 / 9;

    let canvasWidth, canvasHeight;
    if (parentWidth / parentHeight > aspectRatio) {
      canvasHeight = parentHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      canvasWidth = parentWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    console.log("Canvas size updated:", { width: canvasWidth, height: canvasHeight });
  };

  const updateCanvas = (imgSrc, sel, offsets) => {
    console.log("updateCanvas called with:", { imgSrc, sel, offsets, showDesign, showGrid });
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not found");
      return;
    }
  
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  
    // Input validation
    if (!sel || typeof sel.x !== "number" || typeof sel.y !== "number" || sel.width <= 0 || sel.height <= 0) {
      console.error("Invalid selection:", sel);
      ctx.fillStyle = "yellow";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (canvas.width <= 0 || canvas.height <= 0) {
      console.error("Invalid canvas dimensions:", canvas.width, canvas.height);
      ctx.fillStyle = "purple";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
  
    // Define source and destination points for homography
    const srcPoints = [
      [sel.x + offsets.upperLeft.x, sel.y + offsets.upperLeft.y],
      [sel.x + sel.width + offsets.upperRight.x, sel.y + offsets.upperRight.y],
      [sel.x + offsets.lowerLeft.x, sel.y + sel.height + offsets.lowerLeft.y],
      [sel.x + sel.width + offsets.lowerRight.x, sel.y + sel.height + offsets.lowerRight.y],
    ];
    const dstPoints = [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]];
  
    if (offsetsAreZero(offsets)) {
      // Affine Case: Scale and center the selected area directly
      const scaleX = canvas.width / sel.width;
      const scaleY = canvas.height / sel.height;
      const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
      const destWidth = sel.width * scale;
      const destHeight = sel.height * scale;
      const destX = (canvas.width - destWidth) / 2;
      const destY = (canvas.height - destHeight) / 2;
  
      if (showDesign && imgSrc) {
        const img = new Image();
        img.src = imgSrc;
        console.log("Loading image:", imgSrc);
        img.onload = () => {
          ctx.drawImage(
            img,
            sel.x, sel.y, sel.width, sel.height, // Source rectangle
            destX, destY, destWidth, destHeight  // Destination rectangle
          );
          if (showGrid) {
            // Compute H for grid if needed
            const H = [
              [scale, 0, destX - sel.x * scale],
              [0, scale, destY - sel.y * scale],
              [0, 0, 1],
            ];
            drawTransformedGrid(ctx, sel, H);
          }
        };
        img.onerror = () => {
          console.error("Image load failed:", imgSrc);
          ctx.fillStyle = "red";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        };
      } else {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (showGrid) {
          const H = [
            [scale, 0, destX - sel.x * scale],
            [0, scale, destY - sel.y * scale],
            [0, 0, 1],
          ];
          drawTransformedGrid(ctx, sel, H);
        }
      }
    } else {
      // Homography Case: Use a workaround since 2D canvas doesn't support perspective
      const H = getHomography(srcPoints, dstPoints);
      if (!H || H.some(row => row.some(val => !isFinite(val)))) {
        console.error("Homography transform invalid:", H);
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }
  
      if (showDesign && imgSrc) {
        const img = new Image();
        img.src = imgSrc;
        console.log("Loading image:", imgSrc);
        img.onload = () => {
          // Simple approximation: Draw using affine fit, or use a library
          drawPerspectiveImage(ctx, img, H, sel); // Assumes this function handles perspective
          if (showGrid) drawTransformedGrid(ctx, sel, H);
        };
        img.onerror = () => {
          console.error("Image load failed:", imgSrc);
          ctx.fillStyle = "red";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        };
      } else {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (showGrid) drawTransformedGrid(ctx, sel, H);
      }
    }
  };

  const drawPerspectiveImage = (ctx, img, H, sel) => {
    ctx.save();
    const transform = homographyToTransformMatrix(H);
    console.log("Transform matrix:", transform);

    if (transform.some(val => !isFinite(val))) {
      console.warn("Invalid transform matrix, falling back to default scaling");
      ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } else {
      ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
      ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
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
        ctx.lineTo(bottom[0], bottom[1]); // Fixed typo: 'bottom' instead of 'custom'
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
        ctx.lineTo(bottom[0], bottom[1]); // Fixed typo: 'bottom' instead of 'custom'
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Function to update canvas and redraw
    const renderCanvas = () => {
      updateCanvasSize();
      if (image && selection) {
        updateCanvas(image, selection, cornerOffsets);
      } else if (image || !showDesign) {
        updateCanvas(null, selection, cornerOffsets);
      } else {
        console.warn("No image or selection, skipping canvas update");
        const ctx = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;
        ctx.fillStyle = "blue";
        ctx.fillRect(0, 0, 1920, 1080);
      }
    };

    // Wait for DOM and resources to load
    const handleLoad = () => {
      renderCanvas();
    };

    document.addEventListener("DOMContentLoaded", renderCanvas);
    window.addEventListener("load", handleLoad);

    // Handle dynamic resizing
    const resizeObserver = new ResizeObserver(renderCanvas);
    resizeObserver.observe(canvas.parentElement);

    // Cleanup
    return () => {
      document.removeEventListener("DOMContentLoaded", renderCanvas);
      window.removeEventListener("load", handleLoad);
      resizeObserver.disconnect();
    };
  }, [image, selection, showGrid, showDesign, wallWidthFeet, imageDimensions, cornerOffsets]);

  return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh", objectFit: "cover" }} />;
}

export default Display;