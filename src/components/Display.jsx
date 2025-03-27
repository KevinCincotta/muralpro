import React, { useEffect, useRef } from "react";

function Display({ initialImage, initialSelection }) {
  const canvasRef = useRef(null);
  const [image, setImage] = React.useState(initialImage);
  const [selection, setSelection] = React.useState(initialSelection);

  console.log("Display component mounted with initial props:", { initialImage, initialSelection });

  const updateCanvas = (imgSrc, sel) => {
    if (!imgSrc || !sel) {
      console.log("Skipping canvas update: missing image or selection");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("Canvas not found in Display");
      return;
    }

    const ctx = canvas.getContext("2d");
    canvas.width = 1920;
    canvas.height = 1080;

    const img = new Image();
    img.src = imgSrc;
    img.onload = () => {
      console.log("Drawing image on display canvas:", sel);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        sel.x,
        sel.y,
        sel.width,
        sel.height,
        0,
        0,
        1920,
        1080
      );
    };
    img.onerror = (err) => {
      console.error("Error loading image in Display:", err);
    };
  };

  // Set up message listener
  useEffect(() => {
    console.log("Setting up message listener in Display");

    const handleMessage = (event) => {
      const data = event.data;
      if (data.messageType !== "MuralProUpdate") {
        console.log("Ignoring non-MuralPro message:", data);
        return;
      }

      const { image: newImage, selection: newSelection } = data;
      if (newImage && newSelection) {
        console.log("Received MuralPro postMessage in Display:", { newImage, newSelection });
        setImage(newImage);
        setSelection(newSelection);
      } else {
        console.log("Invalid MuralPro postMessage data:", data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Update canvas when image or selection changes
  useEffect(() => {
    console.log("Render effect in Display:", { image, selection });
    if (image && selection) {
      updateCanvas(image, selection);
    } else {
      console.log("Cannot render canvas: missing image or selection");
    }
  }, [image, selection]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100vw", height: "100vh", objectFit: "cover" }}
    />
  );
}

export default Display;