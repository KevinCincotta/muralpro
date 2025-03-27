import React, { useState, useEffect, useRef } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";
import ReactDOM from "react-dom/client";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const displayWindowRef = useRef(null);
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    // Initialize the BroadcastChannel
    const channel = new BroadcastChannel("muralpro");
    broadcastChannelRef.current = channel;

    return () => {
      // Close the BroadcastChannel when the component unmounts
      channel.close();
    };
  }, []);

  // Broadcast updates whenever `image` or `selection` changes
  useEffect(() => {
    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
      });
    }
  }, [image, selection]);

  const handleSelection = (newSelection) => {
    setSelection(newSelection);
  };

  const handleImageLoad = (newImage) => {
    setImage(newImage);

    // Reset selection when a new image is loaded
    setSelection(null);
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
      />
    );
    displayWindowRef.current = newWindow;

    // Broadcast the initial image and selection
    if (image && selection) {
      broadcastChannelRef.current?.postMessage({
        image,
        selection,
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
      <Setup onImageLoad={handleImageLoad} onSelection={handleSelection} />
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