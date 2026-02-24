import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import './split-screen.css';

interface SplitScreenProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
}

export default function SplitScreen({ left, right, defaultLeftWidth = 40 }: SplitScreenProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(pct, 25), 75));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (isMobile) {
    return (
      <div className="split-screen-mobile">
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            Inputs
          </button>
          <button
            className={`mobile-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            Outputs
          </button>
        </div>
        <div className="mobile-content">
          {activeTab === 'input' ? left : right}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`split-screen ${isDragging ? 'dragging' : ''}`}
    >
      <div className="split-left" style={{ width: `${leftWidth}%` }}>
        {left}
      </div>
      <div
        className="split-divider"
        onMouseDown={handleMouseDown}
      />
      <div className="split-right" style={{ width: `${100 - leftWidth}%` }}>
        {right}
      </div>
    </div>
  );
}
