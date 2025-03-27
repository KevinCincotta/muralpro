import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

function Setup({ onImageLoad, onSelection }) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);

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

    return () => {
      canvas.dispose();
      console.log("Fabric canvas disposed");
    };
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.error("No file selected");
      return;
    }

    const url = URL.createObjectURL(file);
    console.log("Image URL created:", url);
    onImageLoad(url);

    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) {
      console.error("Fabric canvas not initialized yet");
      return;
    }

    const imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = () => {
      console.log("Image pre-loaded successfully:", imgElement.width, "x", imgElement.height);

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
        //console.log("Rectangle moved (adjusted):", adjustedSelection);
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
        //console.log("Rectangle scaled (adjusted):", adjustedSelection);
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