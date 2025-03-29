import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHomography, transformPoint, homographyToTransformMatrix } from "../utils/transformUtils";
import "../styles/DisplayPage.css";

function DisplayPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  // State for render parameters
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [wallWidthFeet, setWallWidthFeet] = useState(12);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showDesign, setShowDesign] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [cornerOffsets, setCornerOffsets] = useState({
    upperLeft: { x: 0, y: 0 },
    upperRight: { x: 0, y: 0 },
    lowerLeft: { x: 0, y: 0 },
    lowerRight: { x: 0, y: 0 },
  });
  
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const imageRef = useRef(null); // To hold the loaded image

  // Set up the broadcast channel connection
  useEffect(() => {
    if (!sessionId) {
      console.error("No session ID provided - Display window won't sync");
      return;
    }
    
    console.log(`Connecting to broadcast channel: muralpro-${sessionId}`);
    channelRef.current = new BroadcastChannel(`muralpro-${sessionId}`);
    
    // Listen for updates from the main window
    channelRef.current.onmessage = (event) => {
      // Check for close action first
      if (event.data.action === 'CLOSE_WINDOW') {
        console.log("Received close command, closing window...");
        window.close();
        return;
      }
      
      const { 
        image, selection, wallWidthFeet, 
        imageDimensions, showGrid, 
        showDesign, showDebug, cornerOffsets 
      } = event.data;
      
      console.log("DisplayPage received update:", event.data);
      
      if (image) {
        setImage(image);
        // Preload the image
        const img = new Image();
        img.src = image;
        img.onload = () => {
          imageRef.current = img;
          renderScene();
        };
      }
      if (selection) setSelection(selection);
      if (wallWidthFeet) setWallWidthFeet(wallWidthFeet);
      if (imageDimensions) setImageDimensions(imageDimensions);
      if (showGrid !== undefined) setShowGrid(showGrid);
      if (showDesign !== undefined) setShowDesign(showDesign);
      if (showDebug !== undefined) setShowDebug(showDebug);
      if (cornerOffsets) setCornerOffsets(cornerOffsets);
    };
    
    // Let the main window know we're ready
    window.opener?.postMessage({
      type: 'DISPLAY_READY',
      sessionId
    }, '*');
    
    return () => {
      channelRef.current?.close();
    };
  }, [sessionId]);

  // Helper function to check if all offsets are zero
  const offsetsAreZero = (offsets) => {
    return Object.values(offsets).every(corner => corner.x === 0 && corner.y === 0);
  };

  // Preload image when it changes
  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        imageRef.current = img;
        renderScene();
      };
    }
  }, [image]);

  // Consolidated rendering function
  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Only continue with rendering if we have selection data
    if (!selection) {
      renderDebugInfo(ctx);
      return;
    }
    
    // Calculate transform matrix based on selection and offsets
    const transformData = calculateTransformData(canvas, selection, cornerOffsets);
    if (!transformData) {
      renderDebugInfo(ctx);
      return;
    }
    
    // Draw elements in order: background, image (if visible), then grid (if visible)
    
    // 1. Background is already filled black above
    
    // 2. Draw image if visible and available
    if (showDesign && imageRef.current) {
      drawImage(ctx, imageRef.current, selection, transformData);
    }
    
    // 3. Always draw grid on top if enabled
    if (showGrid) {
      drawGrid(ctx, selection, transformData);
    }
    
    // 4. Draw debug info on top of everything if enabled
    if (showDebug) {
      renderDebugInfo(ctx);
    }
  };

  // Function to render debug info
  const renderDebugInfo = (ctx) => {
    // Add debugging info
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Session ID: ${sessionId}`, 20, 30);
    
    // Make selection info more detailed
    if (selection) {
      ctx.fillStyle = 'lightgreen';
      ctx.fillText(`Selection: x=${selection.x.toFixed(0)}, y=${selection.y.toFixed(0)}, w=${selection.width.toFixed(0)}, h=${selection.height.toFixed(0)}`, 20, 90);
    } else {
      ctx.fillStyle = 'salmon';
      ctx.fillText(`Selection: Not Available - waiting for selection data`, 20, 90);
    }
    
    ctx.fillStyle = 'white';
    ctx.fillText(`Image: ${image ? 'Available' : 'Not Available'}`, 20, 60);
    ctx.fillText(`Show Grid: ${showGrid}`, 20, 120);
    ctx.fillText(`Show Design: ${showDesign}`, 20, 150);
    
    if (!selection) {
      ctx.fillText(`Waiting for selection data...`, 20, 200);
    }
  };

  // Calculate transform data based on selection and offsets
  const calculateTransformData = (canvas, sel, offsets) => {
    // Define source and destination points for the transform
    const srcPoints = [
      [sel.x + offsets.upperLeft.x, sel.y + offsets.upperLeft.y],
      [sel.x + sel.width + offsets.upperRight.x, sel.y + offsets.upperRight.y],
      [sel.x + sel.width + offsets.lowerRight.x, sel.y + sel.height + offsets.lowerRight.y],
      [sel.x + offsets.lowerLeft.x, sel.y + sel.height + offsets.lowerLeft.y],
    ];
    
    const dstPoints = [
      [0, 0],
      [canvas.width, 0],
      [canvas.width, canvas.height],
      [0, canvas.height]
    ];
    
    let H;
    if (offsetsAreZero(offsets)) {
      // Simple scaling matrix
      const scaleX = canvas.width / sel.width;
      const scaleY = canvas.height / sel.height;
      const scale = Math.min(scaleX, scaleY);
      const destWidth = sel.width * scale;
      const destHeight = sel.height * scale;
      const destX = (canvas.width - destWidth) / 2;
      const destY = (canvas.height - destHeight) / 2;
      
      H = [
        [scale, 0, destX - sel.x * scale],
        [0, scale, destY - sel.y * scale],
        [0, 0, 1],
      ];

      return {
        homography: H,
        isSimple: true,
        scale,
        destX,
        destY,
        destWidth,
        destHeight
      };
    } else {
      // Get homography matrix
      H = getHomography(srcPoints, dstPoints);
      if (!H) return null;
      
      return {
        homography: H,
        isSimple: false
      };
    }
  };

  // Draw image function with transform data
  const drawImage = (ctx, img, sel, transformData) => {
    if (transformData.isSimple) {
      // Simple scaling case
      ctx.drawImage(
        img,
        sel.x, sel.y, sel.width, sel.height,
        transformData.destX, transformData.destY, 
        transformData.destWidth, transformData.destHeight
      );
    } else {
      // Perspective transform case
      ctx.save();
      const transform = homographyToTransformMatrix(transformData.homography);
      ctx.setTransform(transform[0], transform[1], transform[2], transform[3], transform[4], transform[5]);
      ctx.drawImage(img, sel.x, sel.y, sel.width, sel.height, 0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  };
  
  // Draw grid function with transform data
  const drawGrid = (ctx, sel, transformData) => {
    if (imageDimensions.width === 0 || wallWidthFeet === 0) return;

    const H = transformData.homography;
    // Calculate grid spacing based on wall width
    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;
    const majorGridSpacingPixels = 4 * pixelsPerFoot; // 4-foot grid
    const minorGridSpacingPixels = 1 * pixelsPerFoot; // 1-foot grid

    // Make major grid lines more visible
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"; // More opaque white
    ctx.lineWidth = 3; // Thicker lines
    
    // Draw major grid lines (vertical)
    for (let x = Math.floor(sel.x / majorGridSpacingPixels) * majorGridSpacingPixels; 
         x <= sel.x + sel.width; 
         x += majorGridSpacingPixels) {
      if (x >= sel.x && x <= sel.x + sel.width) {
        const top = transformPoint([x, sel.y], H);
        const bottom = transformPoint([x, sel.y + sel.height], H);
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(bottom[0], bottom[1]);
        ctx.stroke();
      }
    }
    
    // Draw major grid lines (horizontal)
    for (let y = Math.floor(sel.y / majorGridSpacingPixels) * majorGridSpacingPixels; 
         y <= sel.y + sel.height; 
         y += majorGridSpacingPixels) {
      if (y >= sel.y && y <= sel.y + sel.height) {
        const left = transformPoint([sel.x, y], H);
        const right = transformPoint([sel.x + sel.width, y], H);
        ctx.beginPath();
        ctx.moveTo(left[0], left[1]);
        ctx.lineTo(right[0], right[1]);
        ctx.stroke();
      }
    }

    // Draw minor grid lines with semi-transparency
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; // Semi-transparent white
    ctx.lineWidth = 1;
    
    // Only draw minor lines if the display is large enough
    if (transformData.isSimple && transformData.destWidth > 200) {
      // Draw minor vertical lines
      for (let x = Math.floor(sel.x / minorGridSpacingPixels) * minorGridSpacingPixels; 
           x <= sel.x + sel.width; 
           x += minorGridSpacingPixels) {
        if (x % majorGridSpacingPixels !== 0 && x >= sel.x && x <= sel.x + sel.width) {
          const top = transformPoint([x, sel.y], H);
          const bottom = transformPoint([x, sel.y + sel.height], H);
          ctx.beginPath();
          ctx.moveTo(top[0], top[1]);
          ctx.lineTo(bottom[0], bottom[1]);
          ctx.stroke();
        }
      }
      
      // Draw minor horizontal lines
      for (let y = Math.floor(sel.y / minorGridSpacingPixels) * minorGridSpacingPixels; 
           y <= sel.y + sel.height; 
           y += minorGridSpacingPixels) {
        if (y % majorGridSpacingPixels !== 0 && y >= sel.y && y <= sel.y + sel.height) {
          const left = transformPoint([sel.x, y], H);
          const right = transformPoint([sel.x + sel.width, y], H);
          ctx.beginPath();
          ctx.moveTo(left[0], left[1]);
          ctx.lineTo(right[0], right[1]);
          ctx.stroke();
        }
      }
    }
  };

  // Main rendering update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    updateCanvasSize();
    renderScene();
    
    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
      renderScene();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image, selection, showGrid, showDesign, showDebug, cornerOffsets, wallWidthFeet, imageDimensions, sessionId]);

  return (
    <div className="display-container">
      {!sessionId && (
        <div className="error-message">
          No session ID provided. This window won't sync with the main window.
        </div>
      )}
      <canvas ref={canvasRef} className="display-canvas" />
    </div>
  );
}

export default DisplayPage;
