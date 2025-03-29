import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import CorrectionControls from "./CorrectionControls";
import TabPanel from "./TabPanel";
import "../App.css";

function Setup({ 
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
  cornerOffsets, 
  setCornerOffsets,
  openDisplayWindow 
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCorner, setSelectedCorner] = useState("upperLeft");

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

  const handleTabChange = (index) => {
    setActiveTab(index);
  };

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

      // Calculate scale based on container size and image dimensions
      const containerWidth = containerRef.current.offsetWidth;
      const windowHeight = window.innerHeight * 0.65; // 65% of window height as max
      
      // Calculate scales that would fit width and height
      const scaleWidth = containerWidth / imgElement.width;
      const scaleHeight = windowHeight / imgElement.height;
      
      // Use the smaller scale to ensure image fits in both dimensions
      const scale = Math.min(scaleWidth, scaleHeight, 1); // Don't scale up images that are smaller
      
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

  // Add a window resize handler to adjust the canvas when window changes size
  useEffect(() => {
    const handleResize = () => {
      if (!imageDimensions.width || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const windowHeight = window.innerHeight * 0.65;
      
      const scaleWidth = containerWidth / imageDimensions.width;
      const scaleHeight = windowHeight / imageDimensions.height;
      const newScale = Math.min(scaleWidth, scaleHeight, 1);
      
      if (Math.abs(newScale - scaleFactor) > 0.05) { // Only update if scale changed significantly
        setScaleFactor(newScale);
        
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas) return;
        
        const scaledWidth = imageDimensions.width * newScale;
        const scaledHeight = imageDimensions.height * newScale;
        
        fabricCanvas.setWidth(scaledWidth);
        fabricCanvas.setHeight(scaledHeight);
        
        // Update all objects on canvas with new scale
        fabricCanvas.forEachObject(obj => {
          if (obj.type === 'image') {
            obj.scaleX = newScale;
            obj.scaleY = newScale;
          } else if (obj.type === 'rect') {
            // Preserve the rectangle's relative position and size
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

  // Function to handle corner selection
  const handleCornerSelection = (corner) => {
    setSelectedCorner(corner);
  };

  // Function to adjust the selected corner
  const adjustCorner = (direction, amount = 5) => {
    setCornerOffsets(prev => {
      const newOffsets = { ...prev };
      if (direction === "up") {
        newOffsets[selectedCorner].y -= amount;
      } else if (direction === "down") {
        newOffsets[selectedCorner].y += amount;
      } else if (direction === "left") {
        newOffsets[selectedCorner].x -= amount;
      } else if (direction === "right") {
        newOffsets[selectedCorner].x += amount;
      }
      return newOffsets;
    });
  };

  // Function to reset the selected corner
  const resetCorner = () => {
    setCornerOffsets(prev => ({
      ...prev,
      [selectedCorner]: { x: 0, y: 0 }
    }));
  };

  // Function to reset all corners
  const resetAllCorners = () => {
    setCornerOffsets({
      upperLeft: { x: 0, y: 0 },
      upperRight: { x: 0, y: 0 },
      lowerLeft: { x: 0, y: 0 },
      lowerRight: { x: 0, y: 0 },
    });
  };

  return (
    <div className="setup-container">
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 0 ? 'active' : ''}`}
          onClick={() => handleTabChange(0)}
        >
          Design
        </button>
        <button 
          className={`tab-button ${activeTab === 1 ? 'active' : ''}`}
          onClick={() => handleTabChange(1)}
        >
          Corrections
        </button>
      </div>
      
      {/* Design Tab */}
      <TabPanel value={activeTab} index={0}>
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
      </TabPanel>
      
      {/* Corrections Tab */}
      <TabPanel value={activeTab} index={1}>
        <div className="corrections-tab">
          <div className="corner-selection">
            <h3>Select Corner to Adjust</h3>
            <div className="corner-radio-group">
              {["upperLeft", "upperRight", "lowerLeft", "lowerRight"].map((corner) => (
                <label key={corner} className={`corner-radio ${selectedCorner === corner ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="corner"
                    checked={selectedCorner === corner}
                    onChange={() => handleCornerSelection(corner)}
                  />
                  <div className="corner-label">
                    <div className="corner-icon"></div>
                    <span>{corner.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="corner-visual">
              <div className={`corner-diagram ${selectedCorner}`}>
                <div className="corner-point upperLeft"></div>
                <div className="corner-point upperRight"></div>
                <div className="corner-point lowerLeft"></div>
                <div className="corner-point lowerRight"></div>
              </div>
            </div>
          </div>
          
          <div className="adjustment-controls">
            <h3>Adjust Corner Position</h3>
            <div className="direction-controls">
              <button onClick={() => adjustCorner("up")} className="direction-button up">↑</button>
              <div className="horizontal-controls">
                <button onClick={() => adjustCorner("left")} className="direction-button left">←</button>
                <button onClick={() => adjustCorner("right")} className="direction-button right">→</button>
              </div>
              <button onClick={() => adjustCorner("down")} className="direction-button down">↓</button>
            </div>
            
            <div className="offset-values">
              <div className="offset-field">
                <label>X Offset:</label>
                <input 
                  type="number" 
                  value={cornerOffsets[selectedCorner]?.x || 0} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCornerOffsets(prev => ({
                        ...prev,
                        [selectedCorner]: { ...prev[selectedCorner], x: val }
                      }));
                    }
                  }}
                />
              </div>
              <div className="offset-field">
                <label>Y Offset:</label>
                <input 
                  type="number" 
                  value={cornerOffsets[selectedCorner]?.y || 0} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCornerOffsets(prev => ({
                        ...prev,
                        [selectedCorner]: { ...prev[selectedCorner], y: val }
                      }));
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="reset-buttons">
              <button onClick={resetCorner} className="reset-corner-button">
                Reset This Corner
              </button>
              <button onClick={resetAllCorners} className="reset-all-button">
                Reset All Corners
              </button>
            </div>
          </div>
          
          {/* Preview canvas to show effect of adjustments */}
          <div className="preview-container">
            <h3>Preview</h3>
            <div className="canvas-preview">
              {imageDimensions.width > 0 ? (
                <div className="preview-image">
                  <div className="preview-note">The adjustments will be visible in the Display window.</div>
                </div>
              ) : (
                <div className="no-image-preview">
                  <p>Load an image to see preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}

export default Setup;