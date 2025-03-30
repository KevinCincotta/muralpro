import React, { useState, useEffect, useContext } from "react";
import { StateContext } from "../../context/StateContext";

function CorrectionsTab({
  cornerOffsets,
  setCornerOffsets,
  meshSize,
  setMeshSize
}) {
  const { selection, imageDimensions } = useContext(StateContext);
  const [selectedCorner, setSelectedCorner] = useState("upperLeft");
  const [adjustmentSize, setAdjustmentSize] = useState(5);

  // Function to adjust the selected corner
  const adjustCorner = (direction) => {
    setCornerOffsets(prev => {
      const newOffsets = { ...prev };
      if (direction === "up") {
        newOffsets[selectedCorner].y -= adjustmentSize;
      } else if (direction === "down") {
        newOffsets[selectedCorner].y += adjustmentSize;
      } else if (direction === "left") {
        newOffsets[selectedCorner].x -= adjustmentSize;
      } else if (direction === "right") {
        newOffsets[selectedCorner].x += adjustmentSize;
      }
      return newOffsets;
    });
  };

  // Function to reset selected corner
  const resetSelectedCorner = () => {
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

  const handleMeshSizeChange = (e) => {
    const newMeshSize = parseInt(e.target.value);
    setMeshSize(newMeshSize);
  };

  // Render the corrections preview with integrated corner selection
  const renderCorrectionsPreview = () => {
    if (!selection) return null;
    
    // Canvas dimensions for the preview - make it wider and taller
    const previewWidth = 480; // Increase width to avoid clipping
    const previewHeight = 280; // Increase height to avoid clipping
    
    // Calculate the base rectangle (16:9 area)
    const aspectRatio = 16/9;
    const baseWidth = previewWidth * 0.5; // Make base rectangle smaller to leave more room for labels
    const baseHeight = baseWidth / aspectRatio;
    const baseX = (previewWidth - baseWidth) / 2;
    const baseY = (previewHeight - baseHeight) / 2;
    
    // Scale factor for corner offsets
    const scaleFactor = baseWidth / selection.width * 0.3;
    
    // Calculate the distorted rectangle corners
    const distortedCorners = {
      upperLeft: { 
        x: baseX + (cornerOffsets.upperLeft.x * scaleFactor),
        y: baseY + (cornerOffsets.upperLeft.y * scaleFactor),
        labelX: baseX - 110, // Move label further left
        labelY: baseY - 15,
        offsets: cornerOffsets.upperLeft
      },
      upperRight: { 
        x: baseX + baseWidth + (cornerOffsets.upperRight.x * scaleFactor),
        y: baseY + (cornerOffsets.upperRight.y * scaleFactor),
        labelX: baseX + baseWidth + 20, // Move label further right
        labelY: baseY - 15,
        offsets: cornerOffsets.upperRight
      },
      lowerRight: { 
        x: baseX + baseWidth + (cornerOffsets.lowerRight.x * scaleFactor),
        y: baseY + baseHeight + (cornerOffsets.lowerRight.y * scaleFactor),
        labelX: baseX + baseWidth + 20, // Move label further right
        labelY: baseY + baseHeight + 25,
        offsets: cornerOffsets.lowerRight
      },
      lowerLeft: { 
        x: baseX + (cornerOffsets.lowerLeft.x * scaleFactor),
        y: baseY + baseHeight + (cornerOffsets.lowerLeft.y * scaleFactor),
        labelX: baseX - 110, // Move label further left
        labelY: baseY + baseHeight + 25,
        offsets: cornerOffsets.lowerLeft
      }
    };
    
    return (
      <div className="interactive-preview-container">
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
          
          {/* Draw interactive corner points with labels */}
          {Object.entries(distortedCorners).map(([corner, {x, y, labelX, labelY, offsets}]) => (
            <g key={corner}>
              {/* Corner point */}
              <circle
                cx={x}
                cy={y}
                r={6}
                fill={selectedCorner === corner ? "#dc3545" : "#007bff"}
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCorner(corner)}
              />
              
              {/* Corner offset label - now also clickable */}
              <g 
                className="corner-offset-label" 
                onClick={() => setSelectedCorner(corner)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={labelX}
                  y={labelY}
                  width={90}  // Wider rectangle
                  height={22}
                  rx={4}
                  fill={selectedCorner === corner ? "rgba(220, 53, 69, 0.2)" : "rgba(0, 123, 255, 0.1)"}
                  stroke={selectedCorner === corner ? "#dc3545" : "#007bff"}
                  strokeWidth={1}
                />
                <text
                  x={labelX + 45}  // Adjusted for wider rectangle
                  y={labelY + 15}
                  textAnchor="middle"
                  fill={selectedCorner === corner ? "#dc3545" : "#007bff"}
                  fontSize="12"
                  fontFamily="monospace"
                >
                  X: {offsets.x}, Y: {offsets.y}
                </text>
              </g>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="corrections-tab">
      <div className="corrections-left-panel">       
        <div className="preview-container">
          {imageDimensions.width > 0 ? (
            renderCorrectionsPreview()
          ) : (
            <div className="no-image-preview">
              <p>Load an image to see preview</p>
            </div>
          )}
        </div>
        
        {/* Removed the selected-corner-info section */}
        
        <div className="direction-controls">
          <button onClick={() => adjustCorner("up")} className="direction-button up">↑</button>
          <div className="horizontal-controls">
            <button onClick={() => adjustCorner("left")} className="direction-button left">←</button>
            <button onClick={() => adjustCorner("right")} className="direction-button right">→</button>
          </div>
          <button onClick={() => adjustCorner("down")} className="direction-button down">↓</button>
        </div>
      </div>
      
      <div className="corrections-right-panel">
        <div className="adjustment-settings">
          <div className="slider-control">
            <label>Adjustment Step Size: <span className="slider-value">{adjustmentSize}px</span></label>
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
              max="30"
              value={meshSize}
              onChange={handleMeshSizeChange}
              className="range-slider"
            />
          </div>
        </div>
        
        <div className="reset-buttons">
          <button onClick={resetSelectedCorner} className="reset-corner-button">
            Reset Selected Corner
          </button>
          <button onClick={resetAllCorners} className="reset-all-button">
            Reset All Corners
          </button>
        </div>
      </div>
    </div>
  );
}

export default CorrectionsTab;
