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
  const [selectedCorners, setSelectedCorners] = useState({
    upperLeft: true,
    upperRight: false,
    lowerLeft: false,
    lowerRight: false,
  });
  const [adjustmentSize, setAdjustmentSize] = useState(5); // Default pixels per adjustment
  const [meshSize, setMeshSize] = useState(4); // Default mesh size
  const [selection, setSelection] = useState(null);

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

    // Draw major grid lines (vertical)
    for (let x = 0; x <= imageWidth; x += majorGridSpacingPixels) {
      const scaledX = x * scaleFactor;
      if (scaledX <= canvasWidth) {
        gridLines.push(
          new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
            stroke: "rgba(255, 255, 255, 0.9)", // More opaque white to match display
            strokeWidth: 3, // Thicker lines to match display
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
            stroke: "rgba(255, 255, 255, 0.9)", // More opaque white to match display
            strokeWidth: 3, // Thicker lines to match display
            selectable: false,
            evented: false,
          })
        );
      }
    }

    // Draw minor grid lines (vertical)
    const minorGridSpacingPixels = minorGridSpacingFeet * pixelsPerFoot;
    const scaledMinorGridSpacing = minorGridSpacingPixels * scaleFactor;

    for (let x = 0; x <= imageWidth; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0) {
        const scaledX = x * scaleFactor;
        if (scaledX <= canvasWidth) {
          gridLines.push(
            new fabric.Line([scaledX, 0, scaledX, canvasHeight], {
              stroke: "rgba(255, 255, 255, 0.6)", // Semi-transparent white to match display
              strokeWidth: 1, // Thinner lines for minor grid
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
              stroke: "rgba(255, 255, 255, 0.6)", // Semi-transparent white to match display
              strokeWidth: 1, // Thinner lines for minor grid
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
        x: margin, // Include margin in initial selection
        y: imgHeight - rectHeight - margin, // Include margin in initial selection
        width: rectWidth,
        height: rectHeight,
      };
      setSelection(initialSelection);
      onSelection(initialSelection);
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

  // Function to handle corner selection checkboxes
  const handleCornerSelection = (corner) => {
    setSelectedCorners(prev => ({
      ...prev,
      [corner]: !prev[corner]
    }));
  };

  // Function to adjust the selected corners
  const adjustCorners = (direction, amount = adjustmentSize) => {
    setCornerOffsets(prev => {
      const newOffsets = { ...prev };
      for (const corner in selectedCorners) {
        if (selectedCorners[corner]) {
          if (direction === "up") {
            newOffsets[corner].y -= amount;
          } else if (direction === "down") {
            newOffsets[corner].y += amount;
          } else if (direction === "left") {
            newOffsets[corner].x -= amount;
          } else if (direction === "right") {
            newOffsets[corner].x += amount;
          }
        }
      }
      return newOffsets;
    });
  };

  // Function to reset selected corners
  const resetSelectedCorners = () => {
    setCornerOffsets(prev => {
      const newOffsets = { ...prev };
      for (const corner in selectedCorners) {
        if (selectedCorners[corner]) {
          newOffsets[corner] = { x: 0, y: 0 };
        }
      }
      return newOffsets;
    });
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

  // Add this helper function to convert feet to feet and inches
  const feetToFeetAndInches = (feet) => {
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet - wholeFeet) * 12);
    
    // Handle case where inches equals 12
    if (inches === 12) {
      return `${wholeFeet + 1}' 0"`;
    }
    
    return `${wholeFeet}' ${inches}"`;
  };

  // Update the renderCorrectionsPreview function to warp the rectangle and use blue
  const renderCorrectionsPreview = () => {
    if (!selection) return null;
    
    // Canvas dimensions for the preview
    const previewWidth = 280;
    const previewHeight = 180;
    
    // Calculate the base rectangle (16:9 area)
    const aspectRatio = 16/9;
    const baseWidth = previewWidth * 0.8;
    const baseHeight = baseWidth / aspectRatio;
    const baseX = (previewWidth - baseWidth) / 2;
    const baseY = (previewHeight - baseHeight) / 2;
    
    // Calculate the distorted rectangle corners
    const calcCorner = (baseX, baseY, offsetX, offsetY, scale = 1) => ({
      x: baseX + (offsetX * scale),
      y: baseY + (offsetY * scale)
    });
    
    const scaleFactor = baseWidth / selection.width * 0.1;
    
    const distortedCorners = {
      upperLeft: calcCorner(baseX, baseY, cornerOffsets.upperLeft.x, cornerOffsets.upperLeft.y, scaleFactor),
      upperRight: calcCorner(baseX + baseWidth, baseY, cornerOffsets.upperRight.x, cornerOffsets.upperRight.y, scaleFactor),
      lowerRight: calcCorner(baseX + baseWidth, baseY + baseHeight, cornerOffsets.lowerRight.x, cornerOffsets.lowerRight.y, scaleFactor),
      lowerLeft: calcCorner(baseX, baseY + baseHeight, cornerOffsets.lowerLeft.x, cornerOffsets.lowerLeft.y, scaleFactor),
    };
    
    return (
      <div className="preview-canvas-container">
        <svg width={previewWidth} height={previewHeight} className="preview-svg">
          {/* Draw base rectangle */}
          <rect
            x={baseX}
            y={baseY}
            width={baseWidth}
            height={baseHeight}
            stroke="#aaaaaa"
            strokeWidth={1}
            fill="none"
            strokeDasharray="5,5"
          />
          
          {/* Draw distorted polygon */}
          <polygon
            points={`
              ${distortedCorners.upperLeft.x},${distortedCorners.upperLeft.y} 
              ${distortedCorners.upperRight.x},${distortedCorners.upperRight.y} 
              ${distortedCorners.lowerRight.x},${distortedCorners.lowerRight.y} 
              ${distortedCorners.lowerLeft.x},${distortedCorners.lowerLeft.y}
            `}
            stroke="#007bff"
            strokeWidth={2}
            fill="rgba(0, 123, 255, 0.1)"
          />
          
          {/* Draw corner points */}
          {Object.entries(distortedCorners).map(([key, {x, y}]) => (
            <circle
              key={key}
              cx={x}
              cy={y}
              r={4}
              fill={selectedCorners[key] ? "#dc3545" : "#007bff"}
            />
          ))}
          
          {/* Add labels */}
          <text x={baseX} y={baseY - 10} fontSize="10" fill="#888">Original size</text>
          <text x={baseX} y={baseHeight + baseY + 20} fontSize="10" fill="#007bff">Corrected output</text>
        </svg>
      </div>
    );
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
              
              {selection && (
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
      </TabPanel>
      
      {/* Corrections Tab */}
      <TabPanel value={activeTab} index={1}>
        <div className="corrections-tab">
          <div className="corrections-left-panel">
            <h3>Corners & Adjustments</h3>
            
            <div className="preview-container">
              {imageDimensions.width > 0 ? (
                renderCorrectionsPreview()
              ) : (
                <div className="no-image-preview">
                  <p>Load an image to see preview</p>
                </div>
              )}
            </div>
            
            <div className="direction-controls">
              <button onClick={() => adjustCorners("up")} className="direction-button up">↑</button>
              <div className="horizontal-controls">
                <button onClick={() => adjustCorners("left")} className="direction-button left">←</button>
                <button onClick={() => adjustCorners("right")} className="direction-button right">→</button>
              </div>
              <button onClick={() => adjustCorners("down")} className="direction-button down">↓</button>
            </div>
            
            <div className="adjustment-sliders">
              <div className="slider-control">
                <label>Adjustment Size: <span className="slider-value">{adjustmentSize}px</span></label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={adjustmentSize}
                  onChange={(e) => setAdjustmentSize(parseInt(e.target.value))}
                  className="range-slider"
                />
              </div>
              
              <div className="slider-control">
                <label>Mesh Grid Size: <span className="slider-value">{meshSize}×{meshSize}</span></label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={meshSize}
                  onChange={(e) => setMeshSize(parseInt(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          </div>
          
          <div className="corrections-right-panel">
            <h3>Corner Offsets</h3>
            <div className="offsets-grid">
              {Object.entries(cornerOffsets).map(([corner, { x, y }]) => (
                <div 
                  key={corner} 
                  className={`offset-item ${selectedCorners[corner] ? 'selected' : ''}`}
                  onClick={() => handleCornerSelection(corner)}
                >
                  <div className="offset-item-header">
                    <span className="corner-name">{corner.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className="checkbox-indicator">
                      <input
                        type="checkbox"
                        checked={selectedCorners[corner]}
                        onChange={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <span className="offset-values">X: {x}, Y: {y}</span>
                </div>
              ))}
            </div>
            
            <div className="reset-buttons">
              <button onClick={resetSelectedCorners} className="reset-corner-button">
                Reset Selected Corners
              </button>
              <button onClick={resetAllCorners} className="reset-all-button">
                Reset All Corners
              </button>
            </div>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}

export default Setup;