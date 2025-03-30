import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [meshSize, setMeshSize] = useState(4); // Default mesh size
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  const canvasRef = useRef(null);
  const channelRef = useRef(null);
  const imageRef = useRef(null);

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
      if (event.data.action === 'CLOSE_WINDOW') {
        window.close();
        return;
      }
      
      const { 
        image, selection, wallWidthFeet, 
        imageDimensions, showGrid, 
        showDesign, showDebug, cornerOffsets,
        meshSize: newMeshSize
      } = event.data;
      
      console.log("DisplayPage received update:", event.data);
      
      // Add specific debugging for meshSize
      if (newMeshSize !== undefined) {
        console.log(`DisplayPage: Received mesh size update: ${newMeshSize} (type: ${typeof newMeshSize}), current: ${meshSize}`);
        const parsedSize = parseInt(newMeshSize, 10);
        if (!isNaN(parsedSize) && parsedSize !== meshSize) {
          console.log(`DisplayPage: Updating mesh size from ${meshSize} to ${parsedSize}`);
          setMeshSize(parsedSize);
          // Force a redraw
          setTimeout(renderCanvas, 0);
        }
      }
      
      if (image) setImage(image);
      if (selection) setSelection(selection);
      if (wallWidthFeet) setWallWidthFeet(wallWidthFeet);
      if (imageDimensions) setImageDimensions(imageDimensions);
      if (showGrid !== undefined) setShowGrid(showGrid);
      if (showDesign !== undefined) setShowDesign(showDesign);
      if (showDebug !== undefined) setShowDebug(showDebug);
      if (cornerOffsets) setCornerOffsets(cornerOffsets);
      if (newMeshSize !== undefined) setMeshSize(newMeshSize); // Use !== undefined to handle value 0
    };
    
    // Send a ready message with window dimensions
    sendWindowDimensions();
    
    // Set up resize event listener to broadcast dimensions when window is resized
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      sendWindowDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      channelRef.current?.close();
    };
  }, [sessionId]);
  
  // Function to send window dimensions back to the main window
  const sendWindowDimensions = () => {
    if (channelRef.current && sessionId) {
      channelRef.current.postMessage({
        action: 'WINDOW_DIMENSIONS',
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  };

  // Load the image when it changes
  useEffect(() => {
    if (!image) {
      imageRef.current = null;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.onerror = (err) => {
      console.error("Error loading image:", err);
      imageRef.current = null;
    };
    img.src = image;
  }, [image]);

  // Render the canvas when any parameters change
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return;

    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Set canvas to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale and center the selection within the canvas
    const scaleX = canvas.width / selection.width;
    const scaleY = canvas.height / selection.height;
    const scale = Math.min(scaleX, scaleY, 2); // Limit max scale to 2x
    
    const displayWidth = selection.width * scale;
    const displayHeight = selection.height * scale;
    const offsetX = (canvas.width - displayWidth) / 2;
    const offsetY = (canvas.height - displayHeight) / 2;

    // Draw image with keystone correction if offsets are not all zero
    if (showDesign && img) {
      const hasOffsets = Object.values(cornerOffsets).some(
        corner => corner.x !== 0 || corner.y !== 0
      );

      if (hasOffsets) {
        drawKeystoneImage(
          ctx, 
          img, 
          selection,
          cornerOffsets,
          offsetX,
          offsetY,
          scale
        );
      } else {
        // Simple draw without correction
        ctx.drawImage(
          img,
          selection.x, selection.y, selection.width, selection.height,
          offsetX, offsetY, displayWidth, displayHeight
        );
      }
    }
    
    // Draw grid if enabled
    if (showGrid && imageDimensions.width) {
      drawGrid(
        ctx, 
        selection, 
        wallWidthFeet, 
        imageDimensions,
        cornerOffsets,
        offsetX,
        offsetY,
        scale
      );
    }
    
    // Draw debug info if enabled
    if (showDebug) {
      drawDebugInfo(ctx);
    }
  };

  // Check at initialization if all offsets are indeed zero
  useEffect(() => {
    console.log("Initial cornerOffsets:", cornerOffsets);
  }, []);

  // Normalize the offset values relative to display window dimensions
  const normalizeOffsets = (offsets) => {
    // We're not normalizing based on selection or display size anymore
    // Just return the raw offset values
    return offsets;
  };

  // Draw image with keystone correction
  const drawKeystoneImage = (ctx, img, selection, offsets, baseX, baseY, scale) => {
    // Check if all offsets are very close to zero (allowing for floating-point precision issues)
    const hasNoOffsets = Object.values(offsets).every(
      corner => Math.abs(corner.x) < 0.001 && Math.abs(corner.y) < 0.001
    );
    
    if (hasNoOffsets) {
      console.log("Drawing without keystone correction - offsets all zero");
      // Simple draw without correction when all offsets are zero
      ctx.drawImage(
        img,
        selection.x, selection.y, selection.width, selection.height,
        baseX, baseY, selection.width * scale, selection.height * scale
      );
      return;
    }
    
    console.log("Drawing with keystone correction - offsets:", offsets);
    
    // Define the destination points with raw offsets applied
    const destPoints = [
      [
        baseX + offsets.upperLeft.x, 
        baseY + offsets.upperLeft.y
      ], // top-left
      [
        baseX + selection.width * scale + offsets.upperRight.x, 
        baseY + offsets.upperRight.y
      ], // top-right
      [
        baseX + selection.width * scale + offsets.lowerRight.x, 
        baseY + selection.height * scale + offsets.lowerRight.y
      ], // bottom-right
      [
        baseX + offsets.lowerLeft.x, 
        baseY + selection.height * scale + offsets.lowerLeft.y
      ] // bottom-left
    ];

    // Use advanced canvas transformations for perspective transform
    transformImageWithPerspective(ctx, img, selection, destPoints);
  };

  // Apply perspective transform to the image
  const transformImageWithPerspective = (ctx, img, selection, destPoints) => {
    try {
      // Step 1: Create an offscreen canvas with just the selected portion
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = selection.width;
      offscreenCanvas.height = selection.height;
      const offCtx = offscreenCanvas.getContext('2d');
      
      // Draw only the selected portion to our offscreen canvas
      offCtx.drawImage(
        img,
        selection.x, selection.y, selection.width, selection.height,
        0, 0, selection.width, selection.height
      );

      // Technical limitations explanation:
      // HTML Canvas can only do affine transforms (scale, rotate, translate, skew)
      // but not true perspective transforms. With affine transforms alone, we 
      // cannot correctly map a rectangular image to an arbitrary quadrilateral.
      // That's why we use a mesh-based approach that approximates the transformation.

      // We could try using ctx.transform() for the whole image, but it would only 
      // give us a skewed rectangle, not a proper perspective transform.

      // Log the actual mesh size being used with more details
      console.log(`DisplayPage: Rendering with mesh size: ${meshSize} (type: ${typeof meshSize})`);
      
      // Ensure we use a valid mesh size value
      const GRID_SIZE = Math.max(2, parseInt(meshSize, 10) || 4);
      
      // Use the dynamic meshSize value from state
      const cellWidth = selection.width / GRID_SIZE;
      const cellHeight = selection.height / GRID_SIZE;

      // Draw the mesh
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          // Source rectangle in the original selection
          const sx = x * cellWidth;
          const sy = y * cellHeight;
          const sw = cellWidth;
          const sh = cellHeight;
          
          // Get normalized coordinates for this cell (0-1 range)
          const nx1 = x / GRID_SIZE;
          const ny1 = y / GRID_SIZE;
          const nx2 = (x + 1) / GRID_SIZE;
          const ny2 = (y + 1) / GRID_SIZE;
          
          // Use bilinear interpolation to find the four corners in the destination space
          const getPointInQuad = (u, v) => {
            // Bilinear interpolation between the four destination corners
            const top = [
              destPoints[0][0] * (1 - u) + destPoints[1][0] * u,
              destPoints[0][1] * (1 - u) + destPoints[1][1] * u
            ];
            
            const bottom = [
              destPoints[3][0] * (1 - u) + destPoints[2][0] * u,
              destPoints[3][1] * (1 - u) + destPoints[2][1] * u
            ];
            
            return [
              top[0] * (1 - v) + bottom[0] * v,
              top[1] * (1 - v) + bottom[1] * v
            ];
          };
          
          // Get the four corners of this cell in the destination quadrilateral
          const p1 = getPointInQuad(nx1, ny1);  // top-left
          const p2 = getPointInQuad(nx2, ny1);  // top-right
          const p3 = getPointInQuad(nx2, ny2);  // bottom-right
          const p4 = getPointInQuad(nx1, ny2);  // bottom-left
          
          // Use built-in canvas drawImage with clip path to get the best performance
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.lineTo(p3[0], p3[1]);
          ctx.lineTo(p4[0], p4[1]);
          ctx.closePath();
          ctx.clip();
          
          // We can't easily transform the image directly, so we draw the cell's 
          // portion of the image into the clipped area, which approximates the transform
          ctx.drawImage(
            offscreenCanvas,
            sx, sy, sw, sh,
            Math.min(p1[0], p2[0], p3[0], p4[0]),  // destination x
            Math.min(p1[1], p2[1], p3[1], p4[1]),  // destination y
            Math.max(p1[0], p2[0], p3[0], p4[0]) - Math.min(p1[0], p2[0], p3[0], p4[0]),  // width
            Math.max(p1[1], p2[1], p3[1], p4[1]) - Math.min(p1[1], p2[1], p3[1], p4[1])   // height
          );
          ctx.restore();
        }
      }
    } catch (error) {
      console.error("Error applying perspective transform:", error);
      
      // Fallback to simple scaling if the transform fails
      const scaleX = ctx.canvas.width / selection.width;
      const scaleY = ctx.canvas.height / selection.height;
      const scale = Math.min(scaleX, scaleY);
      
      const destWidth = selection.width * scale;
      const destHeight = selection.height * scale;
      const offsetX = (ctx.canvas.width - destWidth) / 2;
      const offsetY = (ctx.canvas.height - destHeight) / 2;
      
      ctx.drawImage(
        img,
        selection.x, selection.y, selection.width, selection.height,
        offsetX, offsetY, destWidth, destHeight
      );
    }
  };

  // Draw grid with perspective correction
  const drawGrid = (ctx, selection, wallWidthFeet, imageDimensions, offsets, baseX, baseY, scale) => {
    // Convert from selection coordinates to display coordinates with perspective
    const transformPoint = (x, y) => {
      const normalizedX = (x - selection.x) / selection.width;
      const normalizedY = (y - selection.y) / selection.height;
      
      // Apply bilinear interpolation directly with raw offsets
      const tl = [
        baseX + offsets.upperLeft.x, 
        baseY + offsets.upperLeft.y
      ];
      const tr = [
        baseX + selection.width * scale + offsets.upperRight.x, 
        baseY + offsets.upperRight.y
      ];
      const br = [
        baseX + selection.width * scale + offsets.lowerRight.x, 
        baseY + selection.height * scale + offsets.lowerRight.y
      ];
      const bl = [
        baseX + offsets.lowerLeft.x, 
        baseY + selection.height * scale + offsets.lowerLeft.y
      ];

      // Fix the interpolation algorithm to properly account for normalized coordinates
      // This was causing the uneven grid spacing
      const topX = tl[0] * (1 - normalizedX) + tr[0] * normalizedX;
      const topY = tl[1] * (1 - normalizedX) + tr[1] * normalizedX;
      const bottomX = bl[0] * (1 - normalizedX) + br[0] * normalizedX;
      const bottomY = bl[1] * (1 - normalizedX) + br[1] * normalizedX;

      // Fix: Use normalizedY consistently in both calculations
      return [
        topX * (1 - normalizedY) + bottomX * normalizedY,
        topY * (1 - normalizedY) + bottomY * normalizedY
      ];
    };

    // Calculate pixel spacing based on wall width in feet
    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;
    const majorGridSpacingPixels = 4 * pixelsPerFoot;  // 4-foot grid
    const minorGridSpacingPixels = 1 * pixelsPerFoot;  // 1-foot grid
    
    // Major vertical grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    
    // Calculate proper grid line starting positions to ensure even spacing
    const startX = Math.floor(selection.x / majorGridSpacingPixels) * majorGridSpacingPixels;
    const startY = Math.floor(selection.y / majorGridSpacingPixels) * majorGridSpacingPixels;
    
    // Draw major vertical grid lines with fixed spacing
    for (let x = startX; x <= selection.x + selection.width; x += majorGridSpacingPixels) {
      if (x >= selection.x) {
        const p1 = transformPoint(x, selection.y);
        const p2 = transformPoint(x, selection.y + selection.height);
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    }
    
    // Draw major horizontal grid lines with fixed spacing
    for (let y = startY; y <= selection.y + selection.height; y += majorGridSpacingPixels) {
      if (y >= selection.y) {
        const p1 = transformPoint(selection.x, y);
        const p2 = transformPoint(selection.x + selection.width, y);
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    }
    
    // Minor grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    
    // Calculate proper minor grid line starting positions
    const startMinorX = Math.floor(selection.x / minorGridSpacingPixels) * minorGridSpacingPixels;
    const startMinorY = Math.floor(selection.y / minorGridSpacingPixels) * minorGridSpacingPixels;
    
    // Draw minor vertical grid lines
    for (let x = startMinorX; x <= selection.x + selection.width; x += minorGridSpacingPixels) {
      if (x % majorGridSpacingPixels !== 0 && x >= selection.x) {
        const p1 = transformPoint(x, selection.y);
        const p2 = transformPoint(x, selection.y + selection.height);
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    }
    
    // Draw minor horizontal grid lines
    for (let y = startMinorY; y <= selection.y + selection.height; y += minorGridSpacingPixels) {
      if (y % majorGridSpacingPixels !== 0 && y >= selection.y) {
        const p1 = transformPoint(selection.x, y);
        const p2 = transformPoint(selection.x + selection.width, y);
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
      }
    }
  };

  // Draw debug information
  const drawDebugInfo = (ctx) => {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    
    // Add session ID
    ctx.fillText(`Session ID: ${sessionId}`, 20, 30);
    
    // Add image availability
    ctx.fillText(`Image: ${imageRef.current ? 'Available' : 'Not Available'}`, 20, 60);
    
    // Add selection info
    if (selection) {
      ctx.fillStyle = 'lightgreen';
      ctx.fillText(`Selection: x=${selection.x.toFixed(0)}, y=${selection.y.toFixed(0)}, w=${selection.width.toFixed(0)}, h=${selection.height.toFixed(0)}`, 20, 90);
    } else {
      ctx.fillStyle = 'salmon';
      ctx.fillText(`Selection: Not Available`, 20, 90);
    }
    
    // Add display settings
    ctx.fillStyle = 'white';
    ctx.fillText(`Grid: ${showGrid ? 'On' : 'Off'}, Design: ${showDesign ? 'On' : 'Off'}`, 20, 120);
    
    // Add offsets info for debugging
    ctx.fillText(`Offsets: UL(${cornerOffsets.upperLeft.x},${cornerOffsets.upperLeft.y}) UR(${cornerOffsets.upperRight.x},${cornerOffsets.upperRight.y})`, 20, 150);
    ctx.fillText(`         LL(${cornerOffsets.lowerLeft.x},${cornerOffsets.lowerLeft.y}) LR(${cornerOffsets.lowerRight.x},${cornerOffsets.lowerRight.y})`, 20, 180);
    
    // Add mesh size info
    ctx.fillText(`Mesh Grid: ${meshSize} × ${meshSize}`, 20, 210);
  };

  // Effect to render canvas when parameters change
  useEffect(() => {
    renderCanvas();
    
    // Handle window resize
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      sendWindowDimensions();
      renderCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    image, 
    selection, 
    showGrid, 
    showDesign, 
    showDebug, 
    cornerOffsets,
    wallWidthFeet,
    imageDimensions,
    meshSize // Add meshSize to the dependency array to re-render when it changes
  ]);

  // Add a debug check that logs offsets when they change
  useEffect(() => {
    console.log("Corner offsets changed:", cornerOffsets);
  }, [cornerOffsets]);

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
