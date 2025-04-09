import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useDebouncedCallback } from 'use-debounce';

const WhiteboardKonva = ({ roomId, socket }) => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Drawing settings with controls
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrush, setCurrentBrush] = useState(2);
  const [isEraser, setIsEraser] = useState(false);

  // We'll store the size of our Stage here
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  // Adjust Stage size to fill its parent container
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      setStageSize({ width: containerWidth, height: containerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Request current whiteboard data when component mounts
  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('requestWhiteboardData', { roomId });

    }
  }, [roomId, socket]);

  useEffect(() => {
    if (socket) {
      socket.off('whiteboardData');
      socket.on('whiteboardData', (data) => {
        if (data.roomId === roomId && data.lines) {
          setLines(data.lines);
        }
      });
    }
  }, [roomId, socket]);

  // Clear canvas functionality
  const handleClearCanvas = () => {
    setLines([]);
    if (socket && socket.connected) {
      socket.emit('clearWhiteboard', { roomId });
    }
  };

  const debouncedEmitLine = useDebouncedCallback((updatedLine) => {
    if (socket && socket.connected) {
      socket.emit('whiteboardLine', { roomId, line: updatedLine, sender: socket.id });
    }
  }, 10); // Reduced debounce time for smoother drawing

  // Listen for clear canvas events from other participants
  useEffect(() => {
    if (socket) {
      socket.on('whiteboardCleared', () => {
        setLines([]);
      });
    }
    return () => {
      socket?.off('whiteboardCleared');
    };
  }, [socket]);

  // Drawing logic
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = stageRef.current.getPointerPosition();
    const lineColor = isEraser ? "#ffffff" : currentColor;
    const newLine = { points: [pos.x, pos.y], color: lineColor, width: currentBrush, tool: 'line' };
    setLines((prev) => [...prev, newLine]);
    if (socket && socket.connected) {
      socket.emit('whiteboardLine', { roomId, line: newLine, sender: socket.id });
    }
  };

  const handleMouseMove = () => {
    if (!isDrawing) return;
    const pos = stageRef.current.getPointerPosition();
    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      const updatedPoints = lastLine.points.concat([pos.x, pos.y]);
      const updatedLine = { ...lastLine, points: updatedPoints };
      debouncedEmitLine(updatedLine); // Emit the updated line to the server
      return [...prev.slice(0, prev.length - 1), updatedLine];
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if(socket && socket.connected) {
      const lastLine = lines[lines.length - 1];
      socket.emit('drawC', { roomId, line: lastLine, sender: socket.id });
      setLines((prev) => {
        const lastLine = prev[prev.length - 1];
        
        return [...prev,lastLine];
      });
    }
  };

  // Listen for incoming whiteboardLine events
  useEffect(() => {
    if (socket) {
      socket.off('whiteboardLine');
      socket.on('whiteboardLine', (data) => {
        if (data.sender === socket.id) return;
        if (data.roomId !== roomId) return;
        setLines((prev) => [...prev.splice(0,prev.length),data.line]);
      });
      socket.on('drawA', (data) => {
        if (data.sender === socket.id) return;
        if (data.roomId !== roomId) return;
        setLines((prev) => [...prev.splice(0,prev.length), data.line,data.line]);
      })
    }
  }, [roomId, socket]);

  return (
    <div className="relative bg-white rounded-lg shadow-xl p-4 w-full">
      {/* Container for Stage */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '70vh',
          minHeight: '400px',
          position: 'relative',
        }}
        className="border"
      >
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ background: '#ffffff' }}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation="source-over"
                lineJoin="round" // Added for smoother joins
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <span className="text-black">Color:</span>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            disabled={isEraser}
            className="w-10 h-10 border rounded"
          />
        </label>
        <label className="flex items-center space-x-2">
          <span className="text-black">Brush Width:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={currentBrush}
            onChange={(e) => setCurrentBrush(Number(e.target.value))}
          />
          <span>{currentBrush}</span>
        </label>
        <button
          onClick={() => setIsEraser(!isEraser)}
          className={`px-4 py-2 rounded ${isEraser ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
        >
          {isEraser ? 'Disable Eraser' : 'Enable Eraser'}
        </button>
        <button
          onClick={handleClearCanvas}
          className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default WhiteboardKonva;
