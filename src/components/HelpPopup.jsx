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
                            MuralPro helps muralists trace designs onto walls. It's especially useful when projecting different parts of your design onto different parts of the wall.
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
                                <strong>Display setup</strong>: use your projector as a second display.
                                <ul className="sub-list">
                                    <li><strong>Windows</strong>: Press Win+P and select "Extend".</li>
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
                        <h3>🖼️ Load Your Design</h3>
                        <ol>
                            <li>Click or drag/drop your design file to upload it.</li>
                            <li>Drag the corners of the blue rectangle to select the portion of the design you wish to project.</li>
                            <li>
                                Fine-tune the size and position of the selection using keyboard shortcuts:
                                <ul className="sub-list">
                                    <li><strong>Arrow Keys:</strong> Nudge the rectangle in the specified direction.</li>
                                    <li><strong>Plus Key (+)</strong> Zoom in by pulling the upper corners down and in.</li>
                                    <li><strong>Minus Key (-)</strong> Zoom out by pushing the upper corners up and out.</li>
                                    <li>You can make small, medium or large adjustments:</li>
                                    <ul>
                                        <li>By default, the shortcut keys make small 1px adjustments</li>
                                        <li>Hold the <strong>Shift</strong> key for medium 10px adjustments</li>
                                        <li>Hold the <strong>Shift + Option</strong> keys for large 100px adjustments</li>
                                    </ul>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section className="help-section">
                        <h3>🎥 Project Your Design</h3>
                        <ol>
                            <li>Click the green "Project" button to open a display window.</li>
                            <li>
                                Position the display window on your projector then make it full-screen:
                                <ul className="sub-list">
                                    <li><strong>Windows:</strong> Press <strong>F11</strong>.</li>
                                    <li><strong>Mac:</strong> Click the green circle in the top-left corner or press <strong>Control&nbsp;+&nbsp;Command&nbsp;+&nbsp;F</strong>.</li>
                                </ul>
                            </li>
                            <li>Physically position your projector to get approximate alignment.</li>
                            <li>Use the focus and geometry correction functions on your project to get the image clear and rectangular.</li>
                        </ol>
                    </section>

                    <section className="help-section">
                        <h3>📐 Fine-tune Your Projected Image</h3>
                        <ol>
                            <li>Toggle layers to ensure all the grid lines are square and even</li>
                            <ul>
                                <li>Press <strong>G</strong> to toggle the grid off/on.</li>
                                <li>Press <strong>D</strong> to toggle the design off/on.</li>
                            </ul>
                            <li>If you need more geometry correction...</li>
                            <ul>
                                <li>Switch to the <strong>Corrections</strong> tab to fix any keystone distortion.</li>
                                <li>Use the <strong>arrow buttons</strong> to adjust each corner until grid lines appear parallel.</li>

                            </ul>
                        </ol>
                    </section>


                    <section className="help-section">
                        <h3>💡 Tips</h3>
                        <ul>
                            <li>Aim for square grid cells that are approximately 1 foot apart on your wall.</li>
                            <li>You can adjust the Wall Width on the design tab to adjust the spacing of gridlines.</li>
                            <li>For multi-section murals, consider marking key grid intersections on your wall to help with aligning the sections.</li>
                        </ul>
                    </section>

                    <section className="help-section">
                        <h3>🎨 Tracing Your Design</h3>
                        <ol>
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
