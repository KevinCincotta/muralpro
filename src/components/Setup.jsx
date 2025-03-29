import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import CorrectionControls from "./CorrectionControls";
import "../App.css";

function Setup({ onImageLoad, onSelection, wallWidthFeet, showGrid, showDesign, cornerOffsets, setCornerOffsets, setShowGrid, setShowDesign, showDebug, setShowDebug }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const canvas = new fabric.Canvas(canvasElement, {
      selection: false,
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = canvas;

    return () => canvas.dispose();
  }, []);

  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    clearGrid(fabricCanvas);
    if (showGrid) drawGrid(fabricCanvas);
  }, [showGrid, wallWidthFeet, imageDimensions]);

  const drawGrid = (fabricCanvas) => {
    const gridLines = [];
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    const imageWidth = imageDimensions.width;
    const imageHeight = imageDimensions.height;

    if (imageWidth === 0 || imageHeight === 0) return;

    const pixelsPerFoot = imageWidth / wallWidthFeet;
    const majorGridSpacingFeet = 4;
    const minorGridSpacingFeet = 1;
    const majorGridSpacingPixels = majorGridSpacingFeet * pixelsPerFoot;
    const scaledMajorGridSpacing = majorGridSpacingPixels * scaleFactor;

    for (let x = 0; x <= imageWidth; x += majorGridSpacingPixels) {
      const scaledX = x * scaleFactor;
      if (scaledX <= canvasWidth) {
        gridLines.push(
          new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
            stroke: "white",
            strokeWidth: 4,
            selectable: false,
            evented: false,
          })
        );
      }
    }

    for (let y = 0; y <= imageHeight; y += majorGridSpacingPixels) {
      const scaledY = y * scaleFactor;
      if (scaledY <= canvasHeight) {
        gridLines.push(
          new fabric.Line([0, scaledY, canvasWidth, scaledY], {
            stroke: "white",
            strokeWidth: 4,
            selectable: false,
            evented: false,
          })
        );
      }
    }

    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;
    const scaledMinorGridSpacing = minorGridSpacingPixels * scaleFactor;

    for (let x = 0; x <= imageWidth; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0) {
        const scaledX = x * scaleFactor;
        if (scaledX <= canvasWidth) {
          gridLines.push(
            new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
              stroke: "white",
              strokeWidth: 2,
              selectable: false,
              evented: false,
            })
          );
        }
      }
    }

    for (let y = 0; y <= imageHeight; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0) {
        const scaledY = y * scaleFactor;
        if (scaledY <= canvasHeight) {
          gridLines.push(
            new fabric.Line([0, scaledY, canvasWidth, scaledY], {
              stroke: "white",
              strokeWidth: 2,
              selectable: false,
              evented: false,
            })
          );
        }
      }
    }

    gridLines.forEach((line) => fabricCanvas.add(line));
    fabricCanvas.renderAll();
    fabricCanvas.gridLines = gridLines;
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
    if (!file) return;

    const url = URL.createObjectURL(file);
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = () => {
      const dimensions = { width: imgElement.width, height: imgElement.height };
      setImageDimensions(dimensions);
      onImageLoad(url, dimensions);

      const containerWidth = containerRef.current.offsetWidth;
      const scale = containerWidth / imgElement.width;
      setScaleFactor(scale);

      const img = new fabric.Image(imgElement, {
        selectable: false,
        scaleX: scale,
        scaleY: scale,
      });

      fabricCanvas.clear();
      const scaledWidth = imgElement.width * scale;
      const scaledHeight = imgElement.height * scale;
      fabricCanvas.setWidth(scaledWidth);
      fabricCanvas.setHeight(scaledHeight);
      canvasRef.current.width = scaledWidth;
      canvasRef.current.height = scaledHeight;

      fabricCanvas.add(img);

      const imgWidth = imgElement.width;
      const imgHeight = imgElement.height;

      // Calculate a selection with margins
      const margin = 20; // Pixels of margin to ensure outline visibility
      let rectWidth = imgWidth - 2 * margin;
      let rectHeight = (rectWidth * 9) / 16;
      
      if (rectHeight > imgHeight - 2 * margin) {
        rectHeight = imgHeight - 2 * margin;
        rectWidth = (rectHeight * 16) / 9;
      }

      const scaledRectWidth = rectWidth * scale;
      const scaledRectHeight = rectHeight * scale;

      const rect = new fabric.Rect({
        left: margin * scale, // Add margin to left
        top: (scaledHeight - scaledRectHeight) - margin * scale, // Add margin to top
        width: scaledRectWidth,
        height: scaledRectHeight,
        fill: "rgba(0, 0, 255, 0.2)",
        stroke: "blue",
        strokeWidth: 2 / scale,
        selectable: true,
        hasControls: true,
        lockUniScaling: true,
      });

      rect.on("modified", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;
        rect.set({ height: newHeight / scaleX, scaleY: scaleX });
        rect.setCoords();

        onSelection({
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        });
      });

      rect.on("moving", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        onSelection({
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        });
      });

      rect.on("scaling", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        onSelection({
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        });
      });

      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();

      onSelection({
        x: margin, // Include margin in initial selection
        y: imgHeight - rectHeight - margin, // Include margin in initial selection
        width: rectWidth,
        height: rectHeight,
      });
    };
  };

  return (
    <div className="setup-container">
      <h2>Setup</h2>
      <div className="controls-panel">
        <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input" />
        <div className="checkbox-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={() => setShowGrid(prev => !prev)}
            />
            Show Grid (G)
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDesign}
              onChange={() => setShowDesign(prev => !prev)}
            />
            Show Design (D)
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDebug}
              onChange={() => setShowDebug(prev => !prev)}
            />
            Debug Info (I)
          </label>
        </div>
      </div>
      <div ref={containerRef} className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
      <CorrectionControls cornerOffsets={cornerOffsets} setCornerOffsets={setCornerOffsets} />
    </div>
  );
}

export default Setup;