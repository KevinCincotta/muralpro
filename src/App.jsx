import React, { useState, useEffect, useRef } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";
import ReactDOM from "react-dom/client";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const displayWindowRef = useRef(null); // Use ref to persist window reference

  const sendMessageToDisplay = (message, attempts = 5, delay = 200) => {
    if (attempts <= 0) {
      console.error("Failed to send message to Display after retries:", message);
      return;
    }

    const displayWindow = displayWindowRef.current;
    if (displayWindow && !displayWindow.closed) {
      console.log("Sending postMessage from App (attempt", 6 - attempts, "):", message);
      displayWindow.postMessage(message, "*");
    } else {
      console.log("Display window not available, retrying in", delay, "ms...");
      setTimeout(() => sendMessageToDisplay(message, attempts - 1, delay), delay);
    }
  };

  const handleSelection = (newSelection) => {
    setSelection(newSelection);
    const displayWindow = displayWindowRef.current;
    if (!displayWindow || displayWindow.closed) {
      console.log("Display window not open, skipping message send");
      return;
    }
    const message = {
      messageType: "MuralProUpdate",
      image,
      selection: newSelection,
    };
    sendMessageToDisplay(message);
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

    console.log("Display window opened:", newWindow);
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
    console.log("Rendered Display component in new window");
    displayWindowRef.current = newWindow;

    // Send initial message after a longer delay to ensure the listener is set up
    setTimeout(() => {
      const initialMessage = {
        messageType: "MuralProUpdate",
        image,
        selection,
      };
      sendMessageToDisplay(initialMessage);
    }, 2000); // Increased delay to 2000ms
  };

  // Detect when the Display window is closed
  useEffect(() => {
    const checkWindowClosed = () => {
      const displayWindow = displayWindowRef.current;
      if (displayWindow && displayWindow.closed) {
        console.log("Display window closed, clearing reference");
        displayWindowRef.current = null;
      }
    };

    const interval = setInterval(checkWindowClosed, 1000);
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
      <Setup onImageLoad={setImage} onSelection={handleSelection} />
      <button
        onClick={openDisplayWindow}
        disabled={!image || !selection}
        style={{ marginTop: "10px" }}
      >
        Open Display Window
      </button>
    </div>
  );
}

export default App;