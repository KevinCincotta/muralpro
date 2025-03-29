import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Setup from "./components/Setup";
import DisplayPage from "./pages/DisplayPage";
import { StateProvider, StateContext } from "./context/StateContext";
import "./App.css";

function App() {
  return (
    <StateProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </Router>
    </StateProvider>
  );
}

// The main page component with setup functionality
function MainPage() {
  return (
    <div className="app-container">
      <h1>MuralPro</h1>
      <MainContent />
    </div>
  );
}

// MainContent handles the actual setup UI
function MainContent() {
  const { 
    image, setImage, 
    selection, setSelection, 
    wallWidthFeet, setWallWidthFeet, 
    imageDimensions, setImageDimensions, 
    showGrid, setShowGrid, 
    showDesign, setShowDesign,
    showDebug, setShowDebug, 
    cornerOffsets, setCornerOffsets,
    sessionId 
  } = useAppState();

  const broadcastChannelRef = useRef(null);

  const handleSelection = (newSelection) => {
    setSelection(newSelection);
  };

  const handleImageLoad = (newImage, dimensions) => {
    setImage(newImage);
    setImageDimensions(dimensions);
    setSelection(null);
    setShowGrid(false);
    setShowDesign(true);
    setCornerOffsets({
      upperLeft: { x: 0, y: 0 },
      upperRight: { x: 0, y: 0 },
      lowerLeft: { x: 0, y: 0 },
      lowerRight: { x: 0, y: 0 },
    });
  };

  const handleWallWidthChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setWallWidthFeet(value);
    }
  };

  const openDisplayWindow = () => {
    // Create query parameters with just the session ID
    const params = new URLSearchParams({
      sessionId
    });
    
    // Open the display in a new window
    const newWindow = window.open(
      `/display?${params.toString()}`,
      `MuralProDisplay_${Date.now()}`,
      "width=1920,height=1080"
    );
    
    if (!newWindow) {
      console.error("Failed to open display window. Check popup blocker.");
      return;
    }

    // Force an immediate state broadcast after a short delay
    setTimeout(() => {
      console.log("Forcing initial state broadcast to new window");
      // We directly instantiate a new BroadcastChannel to ensure the message goes through
      const channel = new BroadcastChannel(`muralpro-${sessionId}`);
      channel.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
        cornerOffsets
      });
    }, 300); // Shorter delay for faster initial sync
  };

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "g" || event.key === "G") {
        setShowGrid((prev) => !prev);
      } else if (event.key === "d" || event.key === "D") {
        setShowDesign((prev) => !prev);
      } else if (event.key === "i" || event.key === "I") {
        setShowDebug((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setShowGrid, setShowDesign, setShowDebug]);

  return (
    <div>
      <div className="controls">
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
        <button
          onClick={openDisplayWindow}
          disabled={!image}
          className="display-button"
        >
          Open Display Window
        </button>
      </div>
      <Setup
        onImageLoad={handleImageLoad}
        onSelection={handleSelection}
        wallWidthFeet={wallWidthFeet}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showDesign={showDesign}
        setShowDesign={setShowDesign}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
        cornerOffsets={cornerOffsets}
        setCornerOffsets={setCornerOffsets}
      />
    </div>
  );
}

// Helper hook to get app state from context
function useAppState() {
  return React.useContext(StateContext);
}

export default App;