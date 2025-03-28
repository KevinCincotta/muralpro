import React, { useState, useEffect, useRef } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";
import ReactDOM from "react-dom/client";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [wallWidthFeet, setWallWidthFeet] = useState(20);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showDesign, setShowDesign] = useState(true);
  const [cornerOffsets, setCornerOffsets] = useState({
    upperLeft: { x: 0, y: 0 },
    upperRight: { x: 0, y: 0 },
    lowerLeft: { x: 0, y: 0 },
    lowerRight: { x: 0, y: 0 },
  });
  const displayWindowRef = useRef(null);
  const broadcastChannelRef = useRef(new BroadcastChannel("muralpro"));

  // Broadcast state changes to Display window
  useEffect(() => {
    if (image && selection) {
      console.log("Broadcasting state with image URL:", image);
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
        cornerOffsets,
      });
    }
  }, [image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign, cornerOffsets]);

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
    console.log("Opening Display window with state:", { image, selection, cornerOffsets });
    const displayWindow = displayWindowRef.current;
    if (displayWindow && !displayWindow.closed) {
      displayWindow.close();
    }

    const newWindow = window.open("about:blank", `MuralProDisplay_${Date.now()}`, "width=1920,height=1080");
    if (!newWindow) {
      console.error("Failed to open display window. Check popup blocker.");
      return;
    }

    // Set up the Display window's DOM
    newWindow.document.head.innerHTML = `
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>MuralPro Display</title>
    `;
    newWindow.document.body.style.margin = "0";
    newWindow.document.body.style.overflow = "hidden";
    newWindow.document.body.innerHTML = `<div id="display-root"></div>`;
    newWindow.document.title = "MuralPro Display";

    const root = newWindow.document.getElementById("display-root");
    if (!root) {
      console.error("Display root element not found in new window");
      return;
    }

    ReactDOM.createRoot(root).render(
      <Display
        initialImage={image}
        initialSelection={selection}
        initialWallWidthFeet={wallWidthFeet}
        initialImageDimensions={imageDimensions}
        initialShowGrid={showGrid}
        initialShowDesign={showDesign}
        initialCornerOffsets={cornerOffsets}
      />
    );
    displayWindowRef.current = newWindow;

    if (image && selection) {
      console.log("Broadcasting state with image URL:", image);
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
        cornerOffsets,
      });
    }
  };

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "g" || event.key === "G") {
        setShowGrid((prev) => !prev);
      } else if (event.key === "d" || event.key === "D") {
        setShowDesign((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const displayWindow = displayWindowRef.current;
      if (displayWindow && displayWindow.closed) {
        displayWindowRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      const displayWindow = displayWindowRef.current;
      if (displayWindow && !displayWindow.closed) {
        displayWindow.close();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <h1>MuralPro</h1>
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
        showDesign={showDesign}
        cornerOffsets={cornerOffsets}
        setCornerOffsets={setCornerOffsets}
      />
    </div>
  );
}

export default App;