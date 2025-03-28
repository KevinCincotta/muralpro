import React, { useEffect, useRef, useState } from "react";

function Display({ initialImage, initialSelection, initialWallWidthFeet, initialImageDimensions, initialShowGrid, initialShowDesign }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(initialImage);
  const [selection, setSelection] = useState(initialSelection);
  const [wallWidthFeet, setWallWidthFeet] = useState(initialWallWidthFeet || 20);
  const [imageDimensions, setImageDimensions] = useState(initialImageDimensions || { width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(initialShowGrid || false);
  const [showDesign, setShowDesign] = useState(initialShowDesign || true);

  const updateCanvas = (imgSrc, sel) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas not found in Display");
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redrawing

    if (showDesign && imgSrc && sel) {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, 1920, 1080);
        if (showGrid) drawGrid(ctx, sel, 1920, 1080);
      };
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (showGrid && sel) {
        drawGrid(ctx, sel, 1920, 1080);
      }
    }
  };

  // Synchronize state with App via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel("muralpro");
    channel.onmessage = (event) => {
      const { image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign } = event.data;
      setImage(image);
      setSelection(selection || null);
      if (wallWidthFeet) setWallWidthFeet(wallWidthFeet);
      if (imageDimensions) setImageDimensions(imageDimensions);
      if (showGrid !== undefined) setShowGrid(showGrid);
      if (showDesign !== undefined) setShowDesign(showDesign);
    };
    return () => channel.close();
  }, []);

  // Update canvas when relevant states change
  useEffect(() => {
    if (image && selection) updateCanvas(image, selection);
    else if (image || !showDesign) updateCanvas(null, selection);
  }, [image, selection, showGrid, showDesign, wallWidthFeet, imageDimensions]);

  const drawGrid = (ctx, sel, width, height) => {
    if (!sel || imageDimensions.width === 0 || imageDimensions.height === 0) return;

    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;
    const majorGridSpacingFeet = 4;
    const minorGridSpacingFeet = 1;
    const majorGridSpacingPixels = majorGridSpacingFeet * pixelsPerFoot;
    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;

    const scaleX = width / sel.width;
    const scaleY = height / sel.height;

    ctx.strokeStyle = "white";

    // Draw major vertical gridlines
    ctx.lineWidth = 4;
    for (let x = Math.floor(sel.x / majorGridSpacingPixels) * majorGridSpacingPixels; x <= sel.x + sel.width; x += majorGridSpacingPixels) {
      if (x >= sel.x && x <= sel.x + sel.width) {
        const screenX = (x - sel.x) * scaleX;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
    }

    // Draw major horizontal gridlines
    for (let y = Math.floor(sel.y / majorGridSpacingPixels) * majorGridSpacingPixels; y <= sel.y + sel.height; y += majorGridSpacingPixels) {
      if (y >= sel.y && y <= sel.y + sel.height) {
        const screenY = (y - sel.y) * scaleY;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }

    // Draw minor vertical gridlines
    ctx.lineWidth = 2;
    for (let x = Math.floor(sel.x / minorGridSpacingPixels) * minorGridSpacingPixels; x <= sel.x + sel.width; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0 && x >= sel.x && x <= sel.x + sel.width) {
        const screenX = (x - sel.x) * scaleX;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
      }
    }

    // Draw minor horizontal gridlines
    for (let y = Math.floor(sel.y / minorGridSpacingPixels) * minorGridSpacingPixels; y <= sel.y + sel.height; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0 && y >= sel.y && y <= sel.y + sel.height) {
        const screenY = (y - sel.y) * scaleY;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100vw", height: "100vh", objectFit: "cover" }}
    />
  );
}

export default Display;