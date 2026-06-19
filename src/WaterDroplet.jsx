import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [pos, setPos] = useState({ x: 300, y: 200 });
  const [dragging, setDragging] = useState(false);
  const [bgSize, setBgSize] = useState({ width: 0, height: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dropletRef = useRef(null);
  const bgRef = useRef(null);

  const DROPLET_SIZE = 180;
  const ZOOM = 2.2;

  useEffect(() => {
    const updateSize = () => {
      if (bgRef.current) {
        const { offsetWidth, offsetHeight } = bgRef.current;
        setBgSize({ width: offsetWidth, height: offsetHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseDown = (e) => {
    setDragging(true);
    const rect = dropletRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const dropletCenterX = pos.x + DROPLET_SIZE / 2;
  const dropletCenterY = pos.y + DROPLET_SIZE / 2;
  
  const magnifiedStyle = {
    width: `${bgSize.width}px`,
    height: `${bgSize.height}px`,
    transform: `translate(${-dropletCenterX * ZOOM + DROPLET_SIZE / 2}px, ${-dropletCenterY * ZOOM + DROPLET_SIZE / 2}px) scale(${ZOOM})`,
    transformOrigin: '0 0'
  };

  return (
    <div 
      className="app"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="background" ref={bgRef}>
        <h1 className="title">Save File</h1>
        <div className="grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-title">Document {i + 1}</div>
              <div className="card-text">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                Ut enim ad minim veniam.
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={dropletRef}
        className="water-droplet"
        style={{ 
          left: `${pos.x}px`, 
          top: `${pos.y}px`,
          width: `${DROPLET_SIZE}px`,
          height: `${DROPLET_SIZE}px`
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="droplet-content">
          <div className="magnified-bg" style={magnifiedStyle}>
            <h1 className="title">Save File</h1>
            <div className="grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="card">
                  <div className="card-title">Document {i + 1}</div>
                  <div className="card-text">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                    Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
                    Ut enim ad minim veniam.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="droplet-highlight" />
        <div className="droplet-spherical" />
      </div>

      <style jsx>{`
        .app {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          position: relative;
          background: #0a0e27;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
        }

        .background {
          padding: 60px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #8b5cf6 100%);
          min-height: 100vh;
          box-sizing: border-box;
        }

        .title {
          font-size: 72px;
          font-weight: 700;
          color: white;
          margin: 0 0 40px 0;
          letter-spacing: -2px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .card-title {
          font-size: 20px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 8px;
        }

        .card-text {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
        }

        .water-droplet {
          position: absolute;
          cursor: ${dragging ? 'grabbing' : 'grab'};
          border-radius: 50%;
          overflow: hidden;
          /* Removed border, kept soft shadow for depth */
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.4),
            inset 0 -12px 24px rgba(0, 0, 0, 0.3),
            inset 0 8px 20px rgba(255, 255, 255, 0.25);
          transform: ${dragging ? 'scale(1.03)' : 'scale(1)'};
          transition: ${dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'};
        }

        .droplet-content {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          overflow: hidden;
        }

        .magnified-bg {
          position: absolute;
          padding: 60px;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #8b5cf6 100%);
          box-sizing: border-box;
          pointer-events: none;
        }

        .droplet-spherical {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(
            circle at center,
            transparent 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.15) 75%,
            rgba(0, 0, 0, 0.35) 100%
          );
          pointer-events: none;
          mix-blend-mode: multiply;
        }

        .droplet-highlight {
          position: absolute;
          top: 10%;
          left: 15%;
          width: 30%;
          height: 30%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 1) 0%,
            rgba(255, 255, 255, 0.7) 20%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 70%
          );
          filter: blur(0.5px);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}