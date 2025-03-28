import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

function Setup({ onImageLoad, onSelection, wallWidthFeet }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) {
      console.error("Canvas element not found");
      return;
    }

    const canvas = new fabric.Canvas(canvasElement, {
      selection: false,
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = canvas;
    console.log("Fabric canvas initialized:", canvas);

    const handleKeyDown = (event) => {
      if (event.key === "g" || event.key === "G") {
        setShowGrid((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.dispose();
      window.removeEventListener("keydown", handleKeyDown);
      console.log("Fabric canvas disposed");
    };
  }, []);

  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    if (showGrid) {
      drawGrid(fabricCanvas);
    } else {
      clearGrid(fabricCanvas);
    }
  }, [showGrid, scaleFactor, wallWidthFeet, imageDimensions]);

  const drawGrid = (fabricCanvas) => {
    const gridLines = [];
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();

    // Unscaled image dimensions
    const imageWidth = imageDimensions.width;
    const imageHeight = imageDimensions.height;

    if (imageWidth === 0 || imageHeight === 0) return;

    // Calculate pixels per foot based on wall width
    const pixelsPerFoot = imageWidth / wallWidthFeet;

    // Major gridlines every 4 feet, minor gridlines every 1 foot
    const majorGridSpacingFeet = 4;
    const minorGridSpacingFeet = 1;
    const majorGridSpacingPixels = majorGridSpacingFeet * pixelsPerFoot;
    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;

    // Scale the spacing for the canvas
    const scaledMajorGridSpacing = majorGridSpacingPixels * scaleFactor;
    const scaledMinorGridSpacing = minorGridSpacingPixels * scaleFactor;

    // Draw major vertical gridlines
    for (let x = 0; x <= imageWidth; x += majorGridSpacingPixels) {
      const scaledX = x * scaleFactor;
      if (scaledX >= 0 && scaledX <= canvasWidth) {
        gridLines.push(
          new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
            stroke: "white",
            strokeWidth: 4, // Fixed 4px for major gridlines
            selectable: false,
            evented: false,
          })
        );
      }
    }

    // Draw major horizontal gridlines
    for (let y = 0; y <= imageHeight; y += majorGridSpacingPixels) {
      const scaledY = y * scaleFactor;
      if (scaledY >= 0 && scaledY <= canvasHeight) {
        gridLines.push(
          new fabric.Line([0, scaledY, canvasWidth, scaledY], {
            stroke: "white",
            strokeWidth: 4, // Fixed 4px for major gridlines
            selectable: false,
            evented: false,
          })
        );
      }
    }

    // Draw minor vertical gridlines
    for (let x = 0; x <= imageWidth; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0) {
        const scaledX = x * scaleFactor;
        if (scaledX >= 0 && scaledX <= canvasWidth) {
          gridLines.push(
            new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
              stroke: "white",
              strokeWidth: 2, // Fixed 2px for minor gridlines
              selectable: false,
              evented: false,
            })
          );
        }
      }
    }

    // Draw minor horizontal gridlines
    for (let y = 0; y <= imageHeight; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0) {
        const scaledY = y * scaleFactor;
        if (scaledY >= 0 && scaledY <= canvasHeight) {
          gridLines.push(
            new fabric.Line([0, scaledY, canvasWidth, scaledY], {
              stroke: "white",
              strokeWidth: 2, // Fixed 2px for minor gridlines
              selectable: false,
              evented: false,
            })
          );
        }
      }
    }

    // Add gridlines to the canvas
    gridLines.forEach((line) => fabricCanvas.add(line));
    fabricCanvas.renderAll();
    fabricCanvas.gridLines = gridLines; // Store gridlines for clearing later
  };

  const clearGrid = (fabricCanvas) => {
    if (fabricCanvas.gridLines) {
      fabricCanvas.gridLines.forEach((line) => fabricCanvas.remove(line));
      fabricCanvas.gridLines = null;
      fabricCanvas.renderAll();
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.error("No file selected");
      return;
    }

    const url = URL.createObjectURL(file);
    console.log("Image URL created:", url);

    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) {
      console.error("Fabric canvas not initialized yet");
      return;
    }

    const imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = () => {
      console.log("Image pre-loaded successfully:", imgElement.width, "x", imgElement.height);

      // Store unscaled image dimensions and pass to App
      const dimensions = { width: imgElement.width, height: imgElement.height };
      setImageDimensions(dimensions);
      onImageLoad(url, dimensions);

      const containerWidth = containerRef.current.offsetWidth;
      const imageWidth = imgElement.width;
      const scale = containerWidth / imageWidth;
      setScaleFactor(scale);
      console.log("Scale factor calculated:", scale);

      const img = new fabric.Image(imgElement, {
        selectable: false,
        scaleX: scale,
        scaleY: scale,
      });

      if (!img.width || !img.height) {
        console.error("Image failed to initialize in Fabric.js:", img);
        return;
      }

      console.log("Image initialized in Fabric.js:", img.width, "x", img.height);
      fabricCanvas.clear();

      const scaledWidth = imgElement.width * scale;
      const scaledHeight = imgElement.height * scale;
      fabricCanvas.setWidth(scaledWidth);
      fabricCanvas.setHeight(scaledHeight);
      canvasRef.current.width = scaledWidth;
      canvasRef.current.height = scaledHeight;
      console.log("Canvas resized to:", scaledWidth, "x", scaledHeight);

      fabricCanvas.add(img);
      fabricCanvas.renderAll();
      console.log("Image added to canvas and rendered");

      // Calculate maximum 16:9 rectangle fitting within the image
      const imgWidth = imgElement.width;
      const imgHeight = imgElement.height;
      let rectWidth = imgWidth;
      let rectHeight = (rectWidth * 9) / 16;
      if (rectHeight > imgHeight) {
        rectHeight = imgHeight;
        rectWidth = (rectHeight * 16) / 9;
      }
      console.log("Calculated max rectangle (unscaled):", { width: rectWidth, height: rectHeight });

      // Scale the rectangle dimensions
      const scaledRectWidth = rectWidth * scale;
      const scaledRectHeight = rectHeight * scale;

      const rect = new fabric.Rect({
        left: 0,
        top: scaledHeight - scaledRectHeight,
        width: scaledRectWidth,
        height: scaledRectHeight,
        fill: "rgba(0, 0, 255, 0.2)",
        stroke: "blue",
        strokeWidth: 2 / scale,
        selectable: true,
        hasControls: true,
        lockUniScaling: true,
      });
      console.log("Rectangle created (scaled):", {
        left: 0,
        top: scaledHeight - scaledRectHeight,
        width: scaledRectWidth,
        height: scaledRectHeight,
        strokeWidth: 2 / scale,
      });

      rect.on("modified", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;
        rect.set({
          height: newHeight / scaleX,
          scaleY: scaleX,
        });
        rect.setCoords();

        const adjustedSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        console.log("Rectangle modified (adjusted):", adjustedSelection);
        onSelection(adjustedSelection);
      });

      rect.on("moving", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        const adjustedSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        onSelection(adjustedSelection);
      });

      rect.on("scaling", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        const adjustedSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        onSelection(adjustedSelection);
      });

      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();
      console.log("Rectangle added and rendered");

      onSelection({
        x: 0,
        y: (scaledHeight - scaledRectHeight) / scale,
        width: rectWidth,
        height: rectHeight,
      });
    };
    imgElement.onerror = (err) => {
      console.error("Error pre-loading image:", err);
    };
  };

  return (
    <div>
      <h2>Setup</h2>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <div
        ref={containerRef}
        style={{
          maxWidth: "100%",
          overflowX: "auto",
          marginTop: "10px",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ border: "1px solid black" }}
        />
      </div>
    </div>
  );
}

export default Setup;