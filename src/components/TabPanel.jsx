import React from 'react';

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      className="tab-panel"
    >
      {value === index && (
        <div className="tab-panel-content">
          {children}
        </div>
      )}
    </div>
  );
}

export default TabPanel;
