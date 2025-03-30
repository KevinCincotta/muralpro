import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

function DesignTab({ 
  onImageLoad, 
  onSelection, 
  wallWidthFeet,
  setWallWidthFeet,
  showGrid, 
  setShowGrid, 
  showDesign, 
  setShowDesign, 
  showDebug, 
  setShowDebug,
  openDisplayWindow
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState(null);
  const [image, setImage] = useState(null);

  // Initialize the canvas
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    if (!fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasElement, {
        selection: false,
        preserveObjectStacking: true,
      });
      fabricCanvasRef.current = canvas;
    }

    return () => {
      // We don't dispose the canvas when component unmounts
      // since we want to keep it when switching tabs
    };
  }, []);

  // Update grid when needed
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

    // Draw major grid lines (vertical)
    for (let x = 0; x <= imageWidth; x += majorGridSpacingPixels) {
      const scaledX = x * scaleFactor;
      if (scaledX <= canvasWidth) {
        gridLines.push(
          new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
            stroke: "rgba(255, 255, 255, 0.9)",
            strokeWidth: 3,
            selectable: false,
            evented: false,
          })
        );
      }
    }

    // Draw major grid lines (horizontal)
    for (let y = 0; y <= imageHeight; y += majorGridSpacingPixels) {
      const scaledY = y * scaleFactor;
      if (scaledY <= canvasHeight) {
        gridLines.push(
          new fabric.Line([0, scaledY, canvasWidth, scaledY], {
            stroke: "rgba(255, 255, 255, 0.9)",
            strokeWidth: 3,
            selectable: false,
            evented: false,
          })
        );
      }
    }

    // Draw minor grid lines (vertical)
    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;

    for (let x = 0; x <= imageWidth; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0) {
        const scaledX = x * scaleFactor;
        if (scaledX <= canvasWidth) {
          gridLines.push(
            new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
              stroke: "rgba(255, 255, 255, 0.6)",
              strokeWidth: 1,
              selectable: false,
              evented: false,
            })
          );
        }
      }
    }

    // Draw minor grid lines (horizontal)
    for (let y = 0; y <= imageHeight; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0) {
        const scaledY = y * scaleFactor;
        if (scaledY <= canvasHeight) {
          gridLines.push(
            new fabric.Line([0, scaledY, canvasWidth, scaledY], {
              stroke: "rgba(255, 255, 255, 0.6)",
              strokeWidth: 1,
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
    if (fabricCanvas && fabricCanvas.gridLines) {
      fabricCanvas.gridLines.forEach((line) => fabricCanvas.remove(line));
      fabricCanvas.gridLines = null;
      fabricCanvas.renderAll();
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImage(url);
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    const imgElement = new Image();
    imgElement.src = url;
    imgElement.onload = () => {
      const dimensions = { width: imgElement.width, height: imgElement.height };
      setImageDimensions(dimensions);
      onImageLoad(url, dimensions);

      // Calculate scale based on container size and image dimensions
      const containerWidth = containerRef.current.offsetWidth;
      const windowHeight = window.innerHeight * 0.65;
      
      const scaleWidth = containerWidth / imgElement.width;
      const scaleHeight = windowHeight / imgElement.height;
      const scale = Math.min(scaleWidth, scaleHeight, 1);
      
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
      const margin = 20;
      let rectWidth = imgWidth - 2 * margin;
      let rectHeight = (rectWidth * 9) / 16;
      
      if (rectHeight > imgHeight - 2 * margin) {
        rectHeight = imgHeight - 2 * margin;
        rectWidth = (rectHeight * 16) / 9;
      }

      const scaledRectWidth = rectWidth * scale;
      const scaledRectHeight = rectHeight * scale;

      const rect = new fabric.Rect({
        left: margin * scale,
        top: (scaledHeight - scaledRectHeight) - margin * scale,
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

        const newSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        setSelection(newSelection);
        onSelection(newSelection);
      });

      rect.on("moving", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        const newSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        setSelection(newSelection);
        onSelection(newSelection);
      });

      rect.on("scaling", () => {
        const { left, top, width, scaleX } = rect;
        const newWidth = width * scaleX;
        const newHeight = (newWidth * 9) / 16;

        const newSelection = {
          x: left / scale,
          y: top / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        setSelection(newSelection);
        onSelection(newSelection);
      });

      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();

      const initialSelection = {
        x: margin,
        y: imgHeight - rectHeight - margin,
        width: rectWidth,
        height: rectHeight,
      };
      setSelection(initialSelection);
      onSelection(initialSelection);
    };
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!imageDimensions.width || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const windowHeight = window.innerHeight * 0.65;
      
      const scaleWidth = containerWidth / imageDimensions.width;
      const scaleHeight = windowHeight / imageDimensions.height;
      const newScale = Math.min(scaleWidth, scaleHeight, 1);
      
      if (Math.abs(newScale - scaleFactor) > 0.05) {
        setScaleFactor(newScale);
        
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas) return;
        
        const scaledWidth = imageDimensions.width * newScale;
        const scaledHeight = imageDimensions.height * newScale;
        
        fabricCanvas.setWidth(scaledWidth);
        fabricCanvas.setHeight(scaledHeight);
        
        fabricCanvas.forEachObject(obj => {
          if (obj.type === 'image') {
            obj.scaleX = newScale;
            obj.scaleY = newScale;
          } else if (obj.type === 'rect') {
            const oldLeft = obj.left / scaleFactor;
            const oldTop = obj.top / scaleFactor;
            obj.left = oldLeft * newScale;
            obj.top = oldTop * newScale;
            obj.strokeWidth = 2 / newScale;
          }
        });
        
        fabricCanvas.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageDimensions, scaleFactor]);

  const handleWallWidthChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setWallWidthFeet(value);
    }
  };

  // Helper function to convert feet to feet and inches
  const feetToFeetAndInches = (feet) => {
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet - wholeFeet) * 12);
    
    if (inches === 12) {
      return `${wholeFeet + 1}' 0"`;
    }
    
    return `${wholeFeet}' ${inches}"`;
  };

  // We need to make sure the canvas is visible when this tab is active
  useEffect(() => {
    if (containerRef.current && canvasRef.current && fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      canvas.renderAll();
    }
  });

  return (
    <div className="design-tab">
      <div className="design-controls">
        <div className="upload-section">
          <h3>Load Design File</h3>
          <div className="dropzone">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="file-input" 
              id="file-input"
            />
            <label htmlFor="file-input" className="file-drop-area">
              <div className="drop-icon">📁</div>
              <div>Click or drop image file here</div>
            </label>
          </div>
          {imageDimensions.width > 0 && (
            <div className="image-info">
              <p>Image dimensions: {imageDimensions.width} × {imageDimensions.height} px</p>
            </div>
          )}
        </div>
        
        <div className="display-controls">
          <h3>Project Design on Wall</h3>
          <button
            onClick={openDisplayWindow}
            disabled={!imageDimensions.width}
            className="project-button"
          >
            Project
          </button>
          
          <div className="wall-width-control">
            <label>
              Wall Width (feet):
              <input
                type="number"
                value={wallWidthFeet}
                onChange={handleWallWidthChange}
                min="1"
                className="wall-width-input"
              />
            </label>
          </div>
          
          {selection && imageDimensions.width > 0 && (
            <div className="image-info">
              <p>Projection dimensions: {feetToFeetAndInches(selection.width / imageDimensions.width * wallWidthFeet)} × {feetToFeetAndInches(selection.height / imageDimensions.width * wallWidthFeet)}</p>
            </div>
          )}
        </div>
        
        <div className="visibility-controls">
          <h3>Select Layers</h3>
          <div className="checkbox-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={() => setShowGrid(prev => !prev)}
              />
              Show Grid <span className="shortcut-key">G</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showDesign}
                onChange={() => setShowDesign(prev => !prev)}
              />
              Show Design <span className="shortcut-key">D</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showDebug}
                onChange={() => setShowDebug(prev => !prev)}
              />
              Debug Info <span className="shortcut-key">I</span>
            </label>
          </div>
        </div>
      </div>
      
      <div ref={containerRef} className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default DesignTab;
