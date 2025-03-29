import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as fabric from "fabric";
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
  const fabricCanvasRef = useRef(null);
  const channelRef = useRef(null);
  const imageInstanceRef = useRef(null);
  const gridLinesRef = useRef([]);

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
      
      if (image) setImage(image);
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

  // Initialize Fabric.js canvas with WebGL support
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Clean up any existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
    }
    
    // Create a new Fabric canvas with WebGL renderer if supported
    try {
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        backgroundColor: 'black',
        preserveObjectStacking: true,
        enableRetinaScaling: true,
        // Try to use WebGL for better performance and perspective transform support
        renderOnAddRemove: false,
        selection: false
      });
      
      console.log("Fabric.js canvas initialized");
    } catch (error) {
      console.error("Error initializing Fabric.js canvas:", error);
    }
    
    // Set up canvas size
    updateCanvasSize();
    
    // Clean up on unmount
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);
  
  // Update canvas size when window is resized
  const updateCanvasSize = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.setWidth(window.innerWidth);
    fabricCanvasRef.current.setHeight(window.innerHeight);
    console.log("Canvas size updated:", window.innerWidth, window.innerHeight);
  };
  
  // Update rendering when dependencies change
  useEffect(() => {
    if (!fabricCanvasRef.current || !selection) return;
    
    const updateDisplay = async () => {
      const canvas = fabricCanvasRef.current;
      
      // Clear all existing objects
      canvas.clear();
      imageInstanceRef.current = null;
      gridLinesRef.current = [];
      
      // Load and render the image if needed
      if (showDesign && image && selection) {
        try {
          // Load the image first
          const imgElement = await loadImage(image);
          
          // Create a Fabric.js image object
          const fabricImage = new fabric.Image(imgElement, {
            left: 0,
            top: 0,
            selectable: false,
            originX: 'left',
            originY: 'top'
          });
          
          // Save reference to the image for later modifications
          imageInstanceRef.current = fabricImage;
          
          // Crop the image to the selected area
          fabricImage.cropX = selection.x;
          fabricImage.cropY = selection.y;
          fabricImage.width = selection.width;
          fabricImage.height = selection.height;
          
          // Apply perspective transform if offsets are not zero
          if (!areOffsetsZero(cornerOffsets)) {
            applyPerspectiveTransform(fabricImage, cornerOffsets, selection);
          } else {
            // No perspective transform, just fit the image to the canvas
            fitObjectToCanvas(fabricImage, canvas);
          }
          
          // Add the image to the canvas
          canvas.add(fabricImage);
        } catch (error) {
          console.error("Error loading or rendering image:", error);
        }
      }
      
      // Add grid if requested
      if (showGrid && selection && imageDimensions.width) {
        drawGrid(canvas, selection, cornerOffsets);
      }
      
      // Add debug info if needed
      if (showDebug) {
        addDebugInfo(canvas);
      }
      
      // Render the canvas
      canvas.renderAll();
    };
    
    updateDisplay();
  }, [image, selection, cornerOffsets, showGrid, showDesign, showDebug, imageDimensions, wallWidthFeet]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
      
      // Reposition elements after resize
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Promise-based image loading
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };
  
  // Check if all offsets are zero
  const areOffsetsZero = (offsets) => {
    return Object.values(offsets).every(corner => corner.x === 0 && corner.y === 0);
  };
  
  // Apply perspective transform to an object based on corner offsets
  const applyPerspectiveTransform = (obj, offsets, selection) => {
    // Calculate transformed corners based on offsets
    const tl = { x: selection.x + offsets.upperLeft.x, y: selection.y + offsets.upperLeft.y };
    const tr = { x: selection.x + selection.width + offsets.upperRight.x, y: selection.y + offsets.upperRight.y };
    const br = { x: selection.x + selection.width + offsets.lowerRight.x, y: selection.y + selection.height + offsets.lowerRight.y };
    const bl = { x: selection.x + offsets.lowerLeft.x, y: selection.y + selection.height + offsets.lowerLeft.y };
    
    // Fabric.js internally handles calculating the matrix
    const canvas = fabricCanvasRef.current;
    
    // Scale corners to canvas size
    const scaleX = canvas.width / selection.width;
    const scaleY = canvas.height / selection.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the image
    const destWidth = selection.width * scale;
    const destHeight = selection.height * scale;
    const destX = (canvas.width - destWidth) / 2;
    const destY = (canvas.height - destHeight) / 2;
    
    // Set object size to canvas size (it will be transformed to fit)
    obj.set({
      width: canvas.width,
      height: canvas.height,
      left: 0,
      top: 0,
    });
    
    // Apply the perspective transform
    // Note: This uses the experimental perspective transform support in Fabric
    // This would need to be adapted based on Fabric.js version and capabilities
    if (obj.set4PointTransform) {
      // For versions of Fabric that support 4-point transforms directly
      obj.set4PointTransform(
        [tl.x, tl.y],
        [tr.x, tr.y],
        [bl.x, bl.y],
        [br.x, br.y]
      );
    } else {
      // For older versions without direct 4-point transform support
      // We may need to calculate and set the transform matrix manually
      console.warn("Direct 4-point transform not supported in this Fabric.js version");
      fitObjectToCanvas(obj, canvas); // Fallback to simple scaling
    }
  };
  
  // Fit an object to the canvas while preserving aspect ratio
  const fitObjectToCanvas = (obj, canvas) => {
    const scaleX = canvas.width / obj.width;
    const scaleY = canvas.height / obj.height;
    const scale = Math.min(scaleX, scaleY);
    
    obj.set({
      scaleX: scale,
      scaleY: scale,
      left: (canvas.width - obj.width * scale) / 2,
      top: (canvas.height - obj.height * scale) / 2
    });
  };
  
  // Draw grid using Fabric.js objects
  const drawGrid = (canvas, selection, offsets) => {
    if (!wallWidthFeet || wallWidthFeet <= 0 || !imageDimensions.width) return;
    
    // Clear any existing grid
    gridLinesRef.current.forEach(line => {
      canvas.remove(line);
    });
    gridLinesRef.current = [];
    
    // Calculate grid spacing
    const pixelsPerFoot = imageDimensions.width / wallWidthFeet;
    const majorGridSpacingPixels = 4 * pixelsPerFoot; // 4-foot grid
    const minorGridSpacingPixels = 1 * pixelsPerFoot; // 1-foot grid
    
    // Create grid lines
    const createGridLines = () => {
      const lines = [];
      
      // Calculate transform from selection coordinates to canvas coordinates
      const calculateCanvasPoint = (x, y) => {
        // This would need to be adapted based on the current transform
        if (!areOffsetsZero(offsets)) {
          // If using perspective transform, we need to map through the transform
          // This is a simplified example and may need adjustment
          const imageObj = imageInstanceRef.current;
          if (!imageObj) return [0, 0];
          
          // Use same transform as the image object
          // This is a placeholder - the actual implementation would depend on Fabric.js version
          return [x, y]; // Placeholder
        } else {
          // Simple scaling and centering
          const scaleX = canvas.width / selection.width;
          const scaleY = canvas.height / selection.height;
          const scale = Math.min(scaleX, scaleY);
          
          const canvasX = ((x - selection.x) * scale) + (canvas.width - selection.width * scale) / 2;
          const canvasY = ((y - selection.y) * scale) + (canvas.height - selection.height * scale) / 2;
          
          return [canvasX, canvasY];
        }
      };
      
      // Major vertical lines
      for (let x = Math.floor(selection.x / majorGridSpacingPixels) * majorGridSpacingPixels; 
           x <= selection.x + selection.width; 
           x += majorGridSpacingPixels) {
        if (x >= selection.x && x <= selection.x + selection.width) {
          const [x1, y1] = calculateCanvasPoint(x, selection.y);
          const [x2, y2] = calculateCanvasPoint(x, selection.y + selection.height);
          
          const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: 'rgba(255, 255, 255, 0.9)',
            strokeWidth: 3,
            selectable: false
          });
          
          lines.push(line);
          canvas.add(line);
        }
      }
      
      // Major horizontal lines
      for (let y = Math.floor(selection.y / majorGridSpacingPixels) * majorGridSpacingPixels; 
           y <= selection.y + selection.height; 
           y += majorGridSpacingPixels) {
        if (y >= selection.y && y <= selection.y + selection.height) {
          const [x1, y1] = calculateCanvasPoint(selection.x, y);
          const [x2, y2] = calculateCanvasPoint(selection.x + selection.width, y);
          
          const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: 'rgba(255, 255, 255, 0.9)',
            strokeWidth: 3,
            selectable: false
          });
          
          lines.push(line);
          canvas.add(line);
        }
      }
      
      // Minor grid lines
      // Minor vertical lines
      for (let x = Math.floor(selection.x / minorGridSpacingPixels) * minorGridSpacingPixels; 
           x <= selection.x + selection.width; 
           x += minorGridSpacingPixels) {
        if (x % majorGridSpacingPixels !== 0 && x >= selection.x && x <= selection.x + selection.width) {
          const [x1, y1] = calculateCanvasPoint(x, selection.y);
          const [x2, y2] = calculateCanvasPoint(x, selection.y + selection.height);
          
          const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: 'rgba(255, 255, 255, 0.6)',
            strokeWidth: 1,
            selectable: false
          });
          
          lines.push(line);
          canvas.add(line);
        }
      }
      
      // Minor horizontal lines
      for (let y = Math.floor(selection.y / minorGridSpacingPixels) * minorGridSpacingPixels; 
           y <= selection.y + selection.height; 
           y += minorGridSpacingPixels) {
        if (y % majorGridSpacingPixels !== 0 && y >= selection.y && y <= selection.y + selection.height) {
          const [x1, y1] = calculateCanvasPoint(selection.x, y);
          const [x2, y2] = calculateCanvasPoint(selection.x + selection.width, y);
          
          const line = new fabric.Line([x1, y1, x2, y2], {
            stroke: 'rgba(255, 255, 255, 0.6)',
            strokeWidth: 1,
            selectable: false
          });
          
          lines.push(line);
          canvas.add(line);
        }
      }
      
      return lines;
    };
    
    // Create and store grid lines
    gridLinesRef.current = createGridLines();
  };
  
  // Add debug information to the canvas
  const addDebugInfo = (canvas) => {
    // Add session ID
    const sessionIdText = new fabric.Text(`Session ID: ${sessionId}`, {
      left: 20,
      top: 30,
      fill: 'white',
      fontSize: 16,
      fontFamily: 'Arial'
    });
    canvas.add(sessionIdText);
    
    // Add selection info
    if (selection) {
      const selectionText = new fabric.Text(
        `Selection: x=${selection.x.toFixed(0)}, y=${selection.y.toFixed(0)}, w=${selection.width.toFixed(0)}, h=${selection.height.toFixed(0)}`, 
        {
          left: 20,
          top: 90,
          fill: 'lightgreen',
          fontSize: 16,
          fontFamily: 'Arial'
        }
      );
      canvas.add(selectionText);
    } else {
      const noSelectionText = new fabric.Text(
        "Selection: Not Available - waiting for selection data", 
        {
          left: 20,
          top: 90,
          fill: 'salmon',
          fontSize: 16,
          fontFamily: 'Arial'
        }
      );
      canvas.add(noSelectionText);
    }
    
    // Add image availability
    const imageText = new fabric.Text(`Image: ${image ? 'Available' : 'Not Available'}`, {
      left: 20,
      top: 60,
      fill: 'white',
      fontSize: 16,
      fontFamily: 'Arial'
    });
    canvas.add(imageText);
    
    // Add grid status
    const gridText = new fabric.Text(`Show Grid: ${showGrid}`, {
      left: 20,
      top: 120,
      fill: 'white',
      fontSize: 16,
      fontFamily: 'Arial'
    });
    canvas.add(gridText);
    
    // Add design status
    const designText = new fabric.Text(`Show Design: ${showDesign}`, {
      left: 20,
      top: 150,
      fill: 'white',
      fontSize: 16,
      fontFamily: 'Arial'
    });
    canvas.add(designText);
    
    // Add waiting message if needed
    if (!selection) {
      const waitingText = new fabric.Text('Waiting for selection data...', {
        left: 20,
        top: 200,
        fill: 'white',
        fontSize: 16,
        fontFamily: 'Arial'
      });
      canvas.add(waitingText);
    }
  };

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
