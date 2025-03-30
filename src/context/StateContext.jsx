import React, { createContext, useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Create the context
export const StateContext = createContext(null);

// Generate a unique session ID
const generateSessionId = () => {
  // Check if we have one stored in localStorage first
  const storedId = localStorage.getItem('muralpro-session-id');
  if (storedId) return storedId;
  
  // Otherwise create a new one and store it
  const newId = uuidv4();
  localStorage.setItem('muralpro-session-id', newId);
  return newId;
};

export function StateProvider({ children }) {
  // App state
  const [image, setImage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [wallWidthFeet, setWallWidthFeet] = useState(12);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showDesign, setShowDesign] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [cornerOffsets, setCornerOffsets] = useState({
    upperLeft: { x: 0, y: 0 },
    upperRight: { x: 0, y: 0 },
    lowerLeft: { x: 0, y: 0 },
    lowerRight: { x: 0, y: 0 },
  });
  const [meshSize, setMeshSize] = useState(4);

  // Session ID for connecting windows
  const [sessionId] = useState(generateSessionId);
  const broadcastChannelRef = useRef(null);

  // Initialize broadcast channel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel(`muralpro-${sessionId}`);
    
    return () => {
      broadcastChannelRef.current?.close();
    };
  }, [sessionId]);

  // Broadcast state changes - adjusted to handle null values better
  useEffect(() => {
    if (broadcastChannelRef.current) {
      console.log(`Broadcasting state update to channel muralpro-${sessionId}:`, {
        image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign, showDebug, cornerOffsets, meshSize
      });
      
      // Always broadcast current state, regardless of values
      broadcastChannelRef.current.postMessage({
        image,
        selection: selection || null,
        wallWidthFeet,
        imageDimensions,
        showGrid,
        showDesign,
        showDebug,
        cornerOffsets,
        meshSize
      });
    }
  }, [image, selection, wallWidthFeet, imageDimensions, showGrid, showDesign, showDebug, cornerOffsets, meshSize, sessionId]);

  return (
    <StateContext.Provider
      value={{
        image, setImage,
        selection, setSelection,
        wallWidthFeet, setWallWidthFeet,
        imageDimensions, setImageDimensions,
        showGrid, setShowGrid,
        showDesign, setShowDesign,
        showDebug, setShowDebug,
        cornerOffsets, setCornerOffsets,
        meshSize, setMeshSize,
        sessionId, broadcastChannel: broadcastChannelRef.current
      }}
    >
      {children}
    </StateContext.Provider>
  );
}
