import React, { useState } from "react";
import DesignTab from "./tabs/DesignTab";
import CorrectionsTab from "./tabs/CorrectionsTab";
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
  openDisplayWindow,
  meshSize,
  setMeshSize,
  displayWindowSize
}) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (index) => {
    setActiveTab(index);
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
      
      {/* We render both tabs but only show the active one */}
      <div style={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <DesignTab 
          onImageLoad={onImageLoad}
          onSelection={onSelection}
          wallWidthFeet={wallWidthFeet}
          setWallWidthFeet={setWallWidthFeet}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showDesign={showDesign}
          setShowDesign={setShowDesign}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          openDisplayWindow={openDisplayWindow}
          displayWindowSize={displayWindowSize}
        />
      </div>
      
      <div style={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <CorrectionsTab
          cornerOffsets={cornerOffsets}
          setCornerOffsets={setCornerOffsets}
          meshSize={meshSize}
          setMeshSize={setMeshSize}
        />
      </div>
    </div>
  );
}

export default Setup;