import React, { useState, useEffect, useContext } from "react";
import { StateContext } from "../../context/StateContext";

function CorrectionsTab({
  cornerOffsets,
  setCornerOffsets,
  meshSize,
  setMeshSize
}) {
  const { selection, imageDimensions } = useContext(StateContext);
  const [selectedCorners, setSelectedCorners] = useState({
    upperLeft: true,
    upperRight: false,
    lowerLeft: false,
    lowerRight: false,
  });
  const [adjustmentSize, setAdjustmentSize] = useState(5);

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

  // Update handleMeshSizeChange to directly use the prop function
  const handleMeshSizeChange = (e) => {
    const newMeshSize = parseInt(e.target.value);
    console.log(`Mesh size changed to: ${newMeshSize}`);
    setMeshSize(newMeshSize);
  };

  // Render the corrections preview
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
    
    // This scale factor is used to translate corner offsets to preview size
    const scaleFactor = baseWidth / selection.width * 0.3;
    
    // Calculate the distorted rectangle corners
    const distortedCorners = {
      upperLeft: { 
        x: baseX + (cornerOffsets.upperLeft.x * scaleFactor),
        y: baseY + (cornerOffsets.upperLeft.y * scaleFactor)
      },
      upperRight: { 
        x: baseX + baseWidth + (cornerOffsets.upperRight.x * scaleFactor),
        y: baseY + (cornerOffsets.upperRight.y * scaleFactor)
      },
      lowerRight: { 
        x: baseX + baseWidth + (cornerOffsets.lowerRight.x * scaleFactor),
        y: baseY + baseHeight + (cornerOffsets.lowerRight.y * scaleFactor)
      },
      lowerLeft: { 
        x: baseX + (cornerOffsets.lowerLeft.x * scaleFactor),
        y: baseY + baseHeight + (cornerOffsets.lowerLeft.y * scaleFactor)
      }
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
          
          {/* Add mesh size indicator */}
          <text x={baseX + baseWidth - 60} y={baseHeight + baseY + 20} fontSize="10" fill="#555">
            Mesh: {meshSize}×{meshSize}
          </text>
        </svg>
      </div>
    );
  };

  return (
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
              max="30"
              value={meshSize}
              onChange={handleMeshSizeChange}
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
  );
}

export default CorrectionsTab;
