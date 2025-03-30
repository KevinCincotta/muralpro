import React, { useState, useRef, useEffect } from 'react';
import '../styles/HelpPopup.css';

function HelpPopup({ isOpen, onClose }) {
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const popupRef = useRef(null);

    // Handle dragging functionality
    const handleMouseDown = (e) => {
        if (e.target.closest('.help-popup-content')) return;
        setIsDragging(true);
        const rect = popupRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add and remove event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!isOpen) return null;

    return (
        <div
            className="help-popup-overlay"
            ref={popupRef}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`
            }}
        >
            <div
                className="help-popup"
                onMouseDown={handleMouseDown}
            >
                <div className="help-popup-header">
                    <h2>MuralPro Help</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="help-popup-content">
                    <section className="help-section">
                        <h3>👋 Welcome to MuralPro</h3>
                        <p>
                            MuralPro is a tool for projecting designs onto walls to help you create accurate murals.
                            It compensates for keystone distortion and helps you maintain proper proportions in your artwork.
                        </p>
                    </section>

                    <section className="help-section">
                        <h3>📋 Preparation</h3>
                        <ul>
                            <li>
                                <strong>Create a design file</strong>: Use high-resolution images with good contrast.
                                Areas you don't intend to paint should be black for best visibility.
                            </li>
                            <li>
                                <strong>Setup requirements</strong>: You'll need power for your projector and access to WiFi.
                            </li>
                            <li>
                                <strong>Best conditions</strong>: Project at night or in a darkened room for optimal visibility.
                            </li>
                            <li>
                                <strong>Display setup</strong>:
                                <ul className="sub-list">
                                    <li><strong>Windows</strong>: Press Win+P and select "Extend" to use your projector as a second display.</li>
                                    <li><strong>Mac</strong>: Go to System Preferences → Displays → Arrangement and enable "Extend display".</li>
                                </ul>
                            </li>
                            <li>
                                <strong>No WiFi available?</strong> Use your phone as a hotspot:
                                <ul className="sub-list">
                                    <li><strong>iPhone</strong>: Settings → Personal Hotspot → Toggle "Allow Others to Join".</li>
                                    <li><strong>Android</strong>: Settings → Network & Internet → Hotspot & Tethering → WiFi Hotspot.</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    <section className="help-section">
                        <h3>🖼️ Loading Your Design</h3>
                        <ol>
                            <li>Click or drag your design file to upload it.</li>
                            <li>Select the specific region you wish to project by adjusting the blue rectangle.</li>
                            <li>Enter the actual width of your wall in feet (for accurate grid scaling).</li>
                            <li>Click the green "Project" button to open a display window.</li>
                        </ol>
                    </section>

                    <section className="help-section">
                        <h3>📐 Adjusting the Projection</h3>
                        <ol>
                            <li>
                                Position the display window on your projector's screen:
                                <ul className="sub-list">
                                    <li><strong>Windows:</strong> Drag the projection window to your secondary display (projector), then press F11 to make it full-screen, or click the maximize button in the top-right corner.</li>
                                    <li><strong>Mac:</strong> Drag the projection window to your projector display, then click the green circle in the top-left corner to enter full-screen mode, or use Control+Command+F.</li>
                                </ul>
                            </li>
                            <li>Physically position your projector to get approximate alignment.</li>
                            <li>Press "G" to toggle the grid on/off.</li>
                            <li>Press "D" to toggle the design off to focus on grid adjustments.</li>
                            <li>Switch to the Corrections tab to fix any keystone distortion.</li>
                            <li>Use the arrow buttons to adjust each corner until grid lines appear parallel.</li>
                            <li>Aim for square grid cells that are approximately 1 foot apart on your wall.</li>
                        </ol>
                    </section>

                    <section className="help-section">
                        <h3>💡 Tips</h3>
                        <ul>
                            <li>Use larger adjustment steps (100px) for coarse adjustments, then smaller values for fine-tuning.</li>
                            <li>Higher mesh density generally gives smoother distortion correction.</li>
                            <li>The percentages shown in the preview represent how much of the display window's dimensions are being offset.</li>
                        </ul>
                    </section>

                    <section className="help-section">
                        <h3>🎨 Tracing Your Design</h3>
                        <ol>
                            <li>You can adjust the Wall Width on the design tab to adjust the spacing of gridlines.</li>
                            <li>When everything is correct, the grid should be 1 foot squared.</li>
                            <li>For multi-section murals, consider marking key grid intersections on your wall to help with aligning the sections.</li>>
                            <li>Once everything is aligned, turn off the grid ("G" key).</li>
                            <li>Trace this section of your design onto the wall.</li>
                            <li>Repeat for other sections until your entire design is on the the wall.</li>
                        </ol>
                    </section>

                </div>
            </div>
        </div>
    );
}

export default HelpPopup;
