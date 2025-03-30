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
    meshSize, setMeshSize,
    sessionId 
  } = useAppState();

  const broadcastChannelRef = useRef(null);
  const displayWindowRef = useRef(null);
  // Add state for display window dimensions
  const [displayWindowSize, setDisplayWindowSize] = useState({ width: 0, height: 0 });

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
    // Close any existing display window first
    if (displayWindowRef.current && !displayWindowRef.current.closed) {
      // Send a close message to the window before closing it
      try {
        const channel = new BroadcastChannel(`muralpro-${sessionId}`);
        channel.postMessage({
          action: 'CLOSE_WINDOW'
        });
        
        // Give the window a moment to receive the message before closing
        setTimeout(() => {
          displayWindowRef.current.close();
          displayWindowRef.current = null;
        }, 100);
      } catch (error) {
        // In case of any error, force close the window
        displayWindowRef.current.close();
        displayWindowRef.current = null;
      }
    }
    
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

    // Store reference to the new window
    displayWindowRef.current = newWindow;

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
        showDebug,
        cornerOffsets,
        meshSize: parseInt(meshSize) || 4 // Ensure meshSize is a number
      });
      
      // Add debug logging to verify meshSize is being sent
      console.log(`Broadcasting initial state with meshSize: ${meshSize} (type: ${typeof meshSize})`);
    }, 300); // Shorter delay for faster initial sync
  };

  // Check if display window is still open
  useEffect(() => {
    const checkWindowOpen = setInterval(() => {
      if (displayWindowRef.current && displayWindowRef.current.closed) {
        displayWindowRef.current = null;
      }
    }, 1000);
    
    return () => clearInterval(checkWindowOpen);
  }, []);

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

  // Make sure meshSize changes get broadcast to the display window
  useEffect(() => {
    if (broadcastChannelRef.current && sessionId) {
      broadcastChannelRef.current.postMessage({
        meshSize
      });
    }
  }, [meshSize, sessionId]);

  // Force a state rebroadcast when mesh size changes
  const handleMeshSizeChange = (newSize) => {
    // Ensure newSize is a number
    const numericSize = parseInt(newSize) || 4;
    console.log(`App: Setting mesh size to ${numericSize}`);
    
    setMeshSize(numericSize);
    
    // Force a broadcast update to ensure DisplayPage receives it
    setTimeout(() => {
      if (displayWindowRef.current && !displayWindowRef.current.closed) {
        console.log(`App: Broadcasting mesh size change: ${numericSize}`);
        const channel = new BroadcastChannel(`muralpro-${sessionId}`);
        channel.postMessage({
          meshSize: numericSize
        });
      }
    }, 0);
  };

  // Set up the broadcast channel listener
  useEffect(() => {
    if (!sessionId) return;
    
    // Create a broadcast channel if it doesn't exist
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = new BroadcastChannel(`muralpro-${sessionId}`);
    }
    
    // Listen for messages from the display window
    const handleMessage = (event) => {
      if (event.data.action === 'WINDOW_DIMENSIONS') {
        setDisplayWindowSize({
          width: event.data.width,
          height: event.data.height
        });
        console.log(`Received display window dimensions: ${event.data.width}×${event.data.height}`);
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleMessage);
    
    return () => {
      broadcastChannelRef.current.removeEventListener('message', handleMessage);
    };
  }, [sessionId]);

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
        {displayWindowSize.width > 0 && (
          <span className="display-size">
            Display: {displayWindowSize.width} × {displayWindowSize.height}
          </span>
        )}
      </div>
      <Setup
        onImageLoad={handleImageLoad}
        onSelection={handleSelection}
        wallWidthFeet={wallWidthFeet}
        setWallWidthFeet={setWallWidthFeet}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showDesign={showDesign}
        setShowDesign={setShowDesign}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
        cornerOffsets={cornerOffsets}
        setCornerOffsets={setCornerOffsets}
        meshSize={meshSize}
        setMeshSize={handleMeshSizeChange} // Use the handler to ensure broadcasting
        openDisplayWindow={openDisplayWindow}
        displayWindowSize={displayWindowSize}
      />
    </div>
  );
}

// Helper hook to get app state from context
function useAppState() {
  return React.useContext(StateContext);
}

export default App;