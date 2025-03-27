import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric"; // Use wildcard import for fabric.js

function Setup({ onSelection }) {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [image, setImage] = useState(null);
  const [selectionRect, setSelectionRect] = useState(null);

  useEffect(() => {
    // Initialize fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: false,
    });
    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);

      // Wait for fabricCanvas to be initialized before adding the image
      if (fabricCanvas) {
        fabric.Image.fromURL(url, (img) => {
          img.set({ selectable: false });
          fabricCanvas.clear();
          fabricCanvas.setWidth(img.width);
          fabricCanvas.setHeight(img.height);
          fabricCanvas.add(img);
          fabricCanvas.renderAll();
        });
      } else {
        console.error("Fabric canvas is not initialized.");
      }
    }
  };

  const addSelectionRectangle = () => {
    if (selectionRect || !fabricCanvas) return; // Prevent adding multiple rectangles

    // Add a rectangle with 16:9 aspect ratio
    const rect = new fabric.Rect({
      left: 50,
      top: 50,
      width: 160,
      height: 90,
      fill: "rgba(0, 0, 0, 0.3)",
      stroke: "red",
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
    });

    // Enforce 16:9 aspect ratio during resizing
    rect.on("scaling", () => {
      const scaleX = rect.scaleX;
      rect.set({
        scaleY: scaleX * (9 / 16),
        scaleX: scaleX, // Keep scaleX unchanged
      });
      rect.setCoords(); // Update the rectangle's coordinates
    });

    // Update selection in real-time
    rect.on("modified", () => {
      const { left, top, width, height, scaleX, scaleY } = rect;
      onSelection({
        x: left,
        y: top,
        width: width * scaleX,
        height: height * scaleY,
        image,
      });
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    fabricCanvas.renderAll();
    setSelectionRect(rect);
  };

  return (
    <div>
      <h2>Setup</h2>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <button onClick={addSelectionRectangle} disabled={!image || selectionRect}>
        Add Selection Rectangle
      </button>
      <canvas ref={canvasRef} style={{ border: "1px solid black" }}></canvas>
    </div>
  );
}

export default Setup;
