import React, { useEffect, useRef, useState } from "react";

function Display({ initialImage, initialSelection }) {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(initialImage);
  const [selection, setSelection] = useState(initialSelection);

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

  useEffect(() => {
    // Initialize the BroadcastChannel
    const channel = new BroadcastChannel("muralpro");

    const handleMessage = (event) => {
      const { image: newImage, selection: newSelection } = event.data;

      // Ignore invalid messages
      if (!newImage) {
        console.warn("Invalid BroadcastChannel message data:", event.data);
        return;
      }

      console.log("Received BroadcastChannel message in Display:", { newImage, newSelection });
      setImage(newImage);
      setSelection(newSelection || null);
    };

    channel.onmessage = handleMessage;

    return () => {
      // Close the BroadcastChannel when the component unmounts
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (image && selection) {
      updateCanvas(image, selection);
    } else if (image) {
      console.log("Clearing canvas because no selection is available.");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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