import React, { useState } from "react";
import Setup from "./components/Setup";
import Display from "./components/Display";

function App() {
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);

  const handleSelection = (data) => {
    setImage(data.image);
    setSelection({
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    });
  };

  const openDisplayWindow = () => {
    const displayWindow = window.open("", "_blank", "width=1920,height=1080");
    if (displayWindow) {
      displayWindow.document.body.style.margin = "0";
      displayWindow.document.body.style.overflow = "hidden";
      displayWindow.document.body.innerHTML = `<div id="display-root"></div>`;
      const root = displayWindow.document.getElementById("display-root");
      ReactDOM.createRoot(root).render(
        <Display image={image} selection={selection} />
      );
    }
  };

  return (
    <div>
      <Setup onSelection={handleSelection} />
      <button onClick={openDisplayWindow} disabled={!image || !selection}>
        Open Display Window
      </button>
    </div>
  );
}

export default App;
