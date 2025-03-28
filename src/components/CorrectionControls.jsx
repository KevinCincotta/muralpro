import React, { useState } from "react";
import "../App.css";

function CorrectionControls({ cornerOffsets, setCornerOffsets }) {
  const [selectedType, setSelectedType] = useState("Horizontal");
  const step = 1;

  const handleDirectionPress = (direction) => {
    setCornerOffsets((prev) => {
      const newOffsets = JSON.parse(JSON.stringify(prev));
      switch (selectedType) {
        case "Horizontal":
          if (direction === "left") {
            newOffsets.upperLeft.y -= step;
            newOffsets.lowerLeft.y += step;
          } else if (direction === "right") {
            newOffsets.upperRight.y -= step;
            newOffsets.lowerRight.y += step;
          }
          break;
        case "Vertical":
          if (direction === "up") {
            newOffsets.upperLeft.x += step;
            newOffsets.upperRight.x -= step;
          } else if (direction === "down") {
            newOffsets.lowerLeft.x += step;
            newOffsets.lowerRight.x -= step;
          }
          break;
        case "Upper Left":
          if (direction === "left") newOffsets.upperLeft.x -= step;
          else if (direction === "right") newOffsets.upperLeft.x += step;
          else if (direction === "up") newOffsets.upperLeft.y -= step;
          else if (direction === "down") newOffsets.upperLeft.y += step;
          break;
        case "Upper Right":
          if (direction === "left") newOffsets.upperRight.x -= step;
          else if (direction === "right") newOffsets.upperRight.x += step;
          else if (direction === "up") newOffsets.upperRight.y -= step;
          else if (direction === "down") newOffsets.upperRight.y += step;
          break;
        case "Lower Left":
          if (direction === "left") newOffsets.lowerLeft.x -= step;
          else if (direction === "right") newOffsets.lowerLeft.x += step;
          else if (direction === "up") newOffsets.lowerLeft.y -= step;
          else if (direction === "down") newOffsets.lowerLeft.y += step;
          break;
        case "Lower Right":
          if (direction === "left") newOffsets.lowerRight.x -= step;
          else if (direction === "right") newOffsets.lowerRight.x += step;
          else if (direction === "up") newOffsets.lowerRight.y -= step;
          else if (direction === "down") newOffsets.lowerRight.y += step;
          break;
        default:
          break;
      }
      return newOffsets;
    });
  };

  const resetCorner = (corner) => {
    setCornerOffsets((prev) => ({
      ...prev,
      [corner]: { x: 0, y: 0 },
    }));
  };

  const resetAll = () => {
    setCornerOffsets({
      upperLeft: { x: 0, y: 0 },
      upperRight: { x: 0, y: 0 },
      lowerLeft: { x: 0, y: 0 },
      lowerRight: { x: 0, y: 0 },
    });
  };

  return (
    <div className="correction-controls">
      <h3>Geometry Correction</h3>
      <div className="control-group">
        <label>
          Correction Type:
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="correction-select">
            <option value="Horizontal">Horizontal</option>
            <option value="Vertical">Vertical</option>
            <option value="Upper Left">Upper Left</option>
            <option value="Upper Right">Upper Right</option>
            <option value="Lower Left">Lower Left</option>
            <option value="Lower Right">Lower Right</option>
          </select>
        </label>
      </div>
      <div className="direction-buttons">
        <button onClick={() => handleDirectionPress("up")}>↑</button>
        <button onClick={() => handleDirectionPress("down")}>↓</button>
        <button onClick={() => handleDirectionPress("left")}>←</button>
        <button onClick={() => handleDirectionPress("right")}>→</button>
      </div>
      <div className="offsets-display">
        {Object.entries(cornerOffsets).map(([corner, { x, y }]) => (
          <p key={corner}>
            {corner.replace(/([A-Z])/g, " $1").trim()}: x={x}, y={y}
            <button onClick={() => resetCorner(corner)} className="reset-button">Reset</button>
          </p>
        ))}
      </div>
      <button onClick={resetAll} className="reset-all-button">Reset All Corrections</button>
    </div>
  );
}

export default CorrectionControls;