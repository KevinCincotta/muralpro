import React, { useEffect, useRef, useState } from "react";

function Display({ initialImage, initialSelection, initialWallWidthFeet, initialImageDimensions }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(initialImage);
  const [selection, setSelection] = useState(initialSelection);
  const [wallWidthFeet, setWallWidthFeet] = useState(initialWallWidthFeet || 20);
  const [imageDimensions, setImageDimensions] = useState(initialImageDimensions || { width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showDesign, setShowDesign] = useState(true);

  const updateCanvas = (imgSrc, sel) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas not found in Display");
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;

    if (showDesign && imgSrc && sel) {
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          sel.x,
          sel.y,
          sel.width,
          sel.height,
          0,
          0,
          1920,
          1080
        );

        if (showGrid) {
          drawGrid(ctx, sel, 1920, 1080);
        }
      };
      img.onerror = (err) => {
        console.error("Error loading image in Display:", err);
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

  const drawGrid = (ctx, sel, width, height) => {
    if (!sel || imageDimensions.width === 0 || imageDimensions.height === 0) return;

    // Calculate pixels per foot based on wall width and original image width
    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;

    // Major gridlines every 4 feet, minor gridlines every 1 foot
    const majorGridSpacingFeet = 4;
    const minorGridSpacingFeet = 1;
    const majorGridSpacingPixels = majorGridSpacingFeet * pixelsPerFoot;
    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;

    // Scale the spacing for the Display window (1920x1080)
    const scaleX = width / sel.width;
    const scaleY = height / sel.height;

    ctx.strokeStyle = "white";

    // Draw major vertical gridlines
    ctx.lineWidth = 4; // Fixed 4px for major gridlines
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
    ctx.lineWidth = 2; // Fixed 2px for minor gridlines
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "g" || event.key === "G") {
        setShowGrid((prev) => !prev);
      } else if (event.key === "d" || event.key === "D") {
        setShowDesign((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (image && selection) {
      updateCanvas(image, selection);
    } else if (image || !showDesign) {
      updateCanvas(null, selection);
    }
  }, [image, selection, showGrid, showDesign, wallWidthFeet, imageDimensions]);

  useEffect(() => {
    const channel = new BroadcastChannel("muralpro");

    const handleMessage = (event) => {
      const { image: newImage, selection: newSelection, wallWidthFeet: newWallWidthFeet, imageDimensions: newImageDimensions } = event.data;

      if (!newImage) {
        console.warn("Invalid BroadcastChannel message data:", event.data);
        return;
      }

      setImage(newImage);
      setSelection(newSelection || null);
      if (newWallWidthFeet) {
        setWallWidthFeet(newWallWidthFeet);
      }
      if (newImageDimensions) {
        setImageDimensions(newImageDimensions);
      }
    };

    channel.onmessage = handleMessage;

    return () => {
      channel.close();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100vw", height: "100vh", objectFit: "cover" }}
    />
  );
}

export default Display;