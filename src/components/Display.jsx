import React, { useEffect, useRef } from "react";

function Display({ image, selection }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!image || !selection) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const { x, y, width, height } = selection;
      canvas.width = 1920;
      canvas.height = 1080;

      // Clear the canvas and draw the selected portion
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        x,
        y,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };
  }, [image, selection]);

  return <canvas ref={canvasRef} style={{ width: "100vw", height: "100vh" }} />;
}

export default Display;
