import React, { useState, useEffect, useRef } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";
import ReactDOM from "react-dom/client";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [wallWidthFeet, setWallWidthFeet] = useState(20);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showDesign, setShowDesign] = useState(true);
  const displayWindowRef = useRef(null);
  const broadcastChannelRef = useRef(new BroadcastChannel("muralpro"));

  // Broadcast state changes to Display window
  useEffect(() => {
    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
      });
    }
  }, [image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign]);

  const handleSelection = (newSelection) => {
    setSelection(newSelection);
  };

  const handleImageLoad = (newImage, dimensions) => {
    setImage(newImage);
    setImageDimensions(dimensions);
    setSelection(null);
    setShowGrid(false); // Reset grid on new image load
    setShowDesign(true); // Reset design visibility
  };

  const handleWallWidthChange = (event) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setWallWidthFeet(value);
    }
  };

  const openDisplayWindow = () => {
    const displayWindow = displayWindowRef.current;
    if (displayWindow && !displayWindow.closed) {
      displayWindow.close();
    }

    const newWindow = window.open("about:blank", `MuralProDisplay_${Date.now()}`, "width=1920,height=1080");
    if (!newWindow) {
      console.error("Failed to open display window. Check popup blocker.");
      return;
    }

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
      />
    );
    displayWindowRef.current = newWindow;

    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
      });
    }
  };

  // Keyboard event handling for toggling grid and design
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

  // Periodically check if the display window is closed
  useEffect(() => {
    const interval = setInterval(() => {
      const displayWindow = displayWindowRef.current;
      if (displayWindow && displayWindow.closed) {
        displayWindowRef.current = null;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close display window on component unmount
  useEffect(() => {
    return () => {
      const displayWindow = displayWindowRef.current;
      if (displayWindow && !displayWindow.closed) {
        displayWindow.close();
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>MuralPro</h1>
      <div style={{ marginBottom: "10px" }}>
        <label>
          Wall Width (feet):
          <input
            type="number"
            value={wallWidthFeet}
            onChange={handleWallWidthChange}
            min="1"
            style={{ marginLeft: "5px", width: "60px" }}
          />
        </label>
      </div>
      <Setup
        onImageLoad={handleImageLoad}
        onSelection={handleSelection}
        wallWidthFeet={wallWidthFeet}
        showGrid={showGrid}
        showDesign={showDesign}
      />
      <button
        onClick={openDisplayWindow}
        disabled={!image}
        style={{ marginTop: "10px" }}
      >
        Open Display Window
      </button>
    </div>
  );
}

export default App;