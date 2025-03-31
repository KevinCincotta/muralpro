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
  displayWindowSize,
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

      // Calculate a selection centered near the top with a 2% margin
      const margin = 0.02; // 2% margin
      const rectWidth = imgWidth * (1 - 2 * margin);
      const rectHeight = rectWidth / (16 / 9); // Maintain 16:9 aspect ratio

      const scaledRectWidth = rectWidth * scale;
      const scaledRectHeight = rectHeight * scale;

      const rect = new fabric.Rect({
        left: (scaledWidth - scaledRectWidth) / 2,
        top: scaledHeight * margin,
        width: scaledRectWidth,
        height: scaledRectHeight,
        fill: "rgba(0, 0, 255, 0.2)",
        stroke: "blue",
        strokeWidth: 2 / scale,
        selectable: true,
        hasControls: true,
        lockUniScaling: true,
        lockRotation: true, // Disable rotation
      });

      const constrainRect = () => {
        const { left, top, width, scaleX } = rect;
        let newWidth = width * scaleX;
        let newHeight = newWidth / (16 / 9); // Maintain 16:9 aspect ratio

        // Constrain within image boundaries
        const constrainedLeft = Math.max(0, Math.min(left, scaledWidth - newWidth));
        const constrainedTop = Math.max(0, Math.min(top, scaledHeight - newHeight));

        // Adjust width and height if they exceed boundaries
        if (constrainedLeft + newWidth > scaledWidth) {
          newWidth = scaledWidth - constrainedLeft;
          newHeight = newWidth / (16 / 9);
        }
        if (constrainedTop + newHeight > scaledHeight) {
          newHeight = scaledHeight - constrainedTop;
          newWidth = newHeight * (16 / 9);
        }

        rect.set({
          left: constrainedLeft,
          top: constrainedTop,
          width: newWidth,
          height: newHeight,
          scaleX: 1,
          scaleY: 1,
        });
        rect.setCoords();

        const newSelection = {
          x: constrainedLeft / scale,
          y: constrainedTop / scale,
          width: newWidth / scale,
          height: newHeight / scale,
        };
        setSelection(newSelection);
        onSelection(newSelection);
      };

      rect.on("modified", constrainRect);
      rect.on("moving", constrainRect);
      rect.on("scaling", constrainRect);

      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();

      const initialSelection = {
        x: imgWidth * margin,
        y: imgHeight * margin,
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!fabricCanvasRef.current) return;
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (!activeObject || activeObject.type !== "rect") return;

      // Determine step size based on modifier keys
      const step = event.shiftKey && event.altKey ? 100 : event.shiftKey ? 10 : 1;

      const { left, top, width, height } = activeObject;
      let newLeft = left;
      let newTop = top;
      let newWidth = width;
      let newHeight = height;

      // Normalize key for intuitive handling of +, -, =, and _
      let key = event.key;
      if (key === "=" || (key === "+" && event.shiftKey)) key = "+";
      if (key === "-" || (key === "_" && event.shiftKey)) key = "-";

      switch (key) {
        case "ArrowRight":
          newLeft = Math.min(left + step, fabricCanvasRef.current.getWidth() - width);
          break;
        case "ArrowLeft":
          newLeft = Math.max(left - step, 0);
          break;
        case "ArrowDown":
          newTop = Math.min(top + step, fabricCanvasRef.current.getHeight() - height);
          break;
        case "ArrowUp":
          newTop = Math.max(top - step, 0);
          break;
        case "+":
          newWidth = Math.max(width - step * 2, 1);
          newHeight = newWidth / (16 / 9);
          newLeft = Math.min(left + step, fabricCanvasRef.current.getWidth() - newWidth);
          newTop = Math.min(top + step, fabricCanvasRef.current.getHeight() - newHeight);
          break;
        case "-":
          newWidth = Math.min(width + step * 2, fabricCanvasRef.current.getWidth());
          newHeight = newWidth / (16 / 9);
          newLeft = Math.max(left - step, 0);
          newTop = Math.max(top - step, 0);
          break;
        default:
          return;
      }

      activeObject.set({
        left: newLeft,
        top: newTop,
        width: newWidth,
        height: newHeight,
        scaleX: 1,
        scaleY: 1,
      });
      activeObject.setCoords();
      fabricCanvasRef.current.renderAll();

      const newSelection = {
        x: newLeft / scaleFactor,
        y: newTop / scaleFactor,
        width: newWidth / scaleFactor,
        height: newHeight / scaleFactor,
      };
      setSelection(newSelection);
      onSelection(newSelection);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scaleFactor, onSelection]);

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
          
          {/* Move checkboxes to the second column */}
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
            {/* Hide Debug Info checkbox */}
          </div>
        </div>
        
        <div className="visibility-controls">
          {/* Remove the Select Layers title */}
          {/* Dimensions group box */}
          <div className="dimensions-group">
            <h3>Dimensions</h3>
            <div className="dimensions-content">
              {imageDimensions.width > 0 && (
                <div className="dimension-item">
                  <span className="dimension-label">Image:</span>
                  <span className="dimension-value">{imageDimensions.width} × {imageDimensions.height} px</span>
                </div>
              )}
              
              {selection && (
                <div className="dimension-item">
                  <span className="dimension-label">Selection:</span>
                  <span className="dimension-value">{Math.round(selection.width)} × {Math.round(selection.height)} px</span>
                </div>
              )}
              
              {displayWindowSize.width > 0 && (
                <div className="dimension-item">
                  <span className="dimension-label">Display:</span>
                  <span className="dimension-value">{displayWindowSize.width} × {displayWindowSize.height} px</span>
                </div>
              )}
              
              {selection && imageDimensions.width > 0 && (
                <div className="dimension-item">
                  <span className="dimension-label">Projection:</span>
                  <span className="dimension-value">
                    {feetToFeetAndInches(selection.width / imageDimensions.width * wallWidthFeet)} × {feetToFeetAndInches(selection.height / imageDimensions.width * wallWidthFeet)}
                  </span>
                </div>
              )}
            </div>
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
