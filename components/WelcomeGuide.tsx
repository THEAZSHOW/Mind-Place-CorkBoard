import React from 'react';

interface WelcomeGuideProps {
  onClose: () => void;
}

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
  return (
    <div className="welcome-overlay">
      <div className="welcome-content">
        <h1 className="welcome-title">Welcome to Infinite Corkboard!</h1>
        <p className="welcome-text">
          This is your space to think, create, and connect ideas. Here are a few tips to get you started:
        </p>
        <div className="welcome-features">
          <div className="welcome-feature">
            <div className="welcome-feature-icon">✨</div>
            <div className="welcome-feature-text"><b>Toolbar:</b> Add notes, images, videos, emojis, and draw shapes using the top toolbar.</div>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">🖱️</div>
            <div className="welcome-feature-text"><b>Navigate:</b> <b>Click-drag</b> the canvas to pan. Use your <b>mouse wheel</b> or <b>pinch gesture</b> to zoom in and out.</div>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">📝</div>
            <div className="welcome-feature-text"><b>Quick Note:</b> <b>Double-click</b> anywhere on the empty board to instantly create a new sticky note.</div>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">📦</div>
            <div className="welcome-feature-text"><b>Select & Style:</b> Click items to select them. Use the corner handles to resize and rotate. Style shapes using the contextual toolbar.</div>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">🔗</div>
            <div className="welcome-feature-text"><b>Connect Ideas:</b> Pinned items have a red "string" attachment point. Drag from it to connect items together.</div>
          </div>
          <div className="welcome-feature">
            <div className="welcome-feature-icon">💾</div>
            <div className="welcome-feature-text"><b>Save & Load:</b> Use the save and load icons to backup your board to a file and restore it later.</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          Got it, let's start!
        </button>
      </div>
    </div>
  );
};
