import React, { useState, useEffect, useRef } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";
import ReactDOM from "react-dom/client";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [wallWidthFeet, setWallWidthFeet] = useState(20);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const displayWindowRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    const channel = new BroadcastChannel("muralpro");
    broadcastChannelRef.current = channel;

    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
      });
    }
  }, [image, selection, wallWidthFeet, imageDimensions]);

  const handleSelection = (newSelection) => {
    setSelection(newSelection);
  };

  const handleImageLoad = (newImage, dimensions) => {
    setImage(newImage);
    setImageDimensions(dimensions);
    setSelection(null);
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
      />
    );
    displayWindowRef.current = newWindow;

    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
        wallWidthFeet,
        imageDimensions,
      });
    }
  };

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
      <Setup onImageLoad={handleImageLoad} onSelection={handleSelection} wallWidthFeet={wallWidthFeet} />
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