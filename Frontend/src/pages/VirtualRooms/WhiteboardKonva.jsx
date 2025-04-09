import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useDebouncedCallback } from 'use-debounce';

const WhiteboardKonva = ({ roomId, socket }) => {
  const [lines, setLines] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLineId, setCurrentLineId] = useState(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBrush, setCurrentBrush] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  const handleResize = useCallback(() => {
    if (!containerRef.current) return;
    const { offsetWidth, offsetHeight } = containerRef.current;
    setStageSize({ width: offsetWidth, height: offsetHeight });
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (socket?.connected) {
      socket.emit('requestWhiteboardData', { roomId });
    }
  }, [roomId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardData = (data) => {
      if (data.roomId === roomId && data.lines && typeof data.lines === 'object') {
        setLines(data.lines);
      }
    };

    const handleWhiteboardCleared = (data) => {
      if (data.roomId === roomId) {
        setLines({});
        setIsDrawing(false);
        setCurrentLineId(null);
      }
    };

    socket.on('whiteboardData', handleWhiteboardData);
    socket.on('whiteboardCleared', handleWhiteboardCleared);

    return () => {
      socket.off('whiteboardData', handleWhiteboardData);
      socket.off('whiteboardCleared', handleWhiteboardCleared);
    };
  }, [roomId, socket]);

  const handleClearCanvas = useCallback(() => {
    setLines({});
    setIsDrawing(false);
    setCurrentLineId(null);
    
    if (socket?.connected) {
      socket.emit('clearWhiteboard', { roomId });
    }
  }, [roomId, socket]);

  const debouncedEmitLine = useDebouncedCallback((lineId, updatedLine) => {
    if (socket?.connected) {
      socket.emit('whiteboardLine', { roomId, lineId, line: updatedLine, sender: socket.id });
    }
  }, 10);

  const handleMouseDown = useCallback((e) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const lineColor = isEraser ? "#ffffff" : currentColor;
    const lineId = `${socket.id}-${Date.now()}`;
    
    const newLine = { 
      points: [pos.x, pos.y], 
      color: lineColor, 
      width: currentBrush, 
      tool: 'line',
      userId: socket.id
    };
    
    setCurrentLineId(lineId);
    setLines(prev => ({ ...prev, [lineId]: newLine }));
    
    if (socket?.connected) {
      socket.emit('whiteboardLine', { roomId, lineId, line: newLine, sender: socket.id });
    }
  }, [currentBrush, currentColor, isEraser, roomId, socket]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing || !currentLineId) return;
    
    const pos = stageRef.current.getPointerPosition();
    
    setLines(prev => {
      if (!prev[currentLineId]) return prev;
      
      const updatedLine = {
        ...prev[currentLineId],
        points: [...prev[currentLineId].points, pos.x, pos.y]
      };
      
      debouncedEmitLine(currentLineId, updatedLine);
      
      return { ...prev, [currentLineId]: updatedLine };
    });
  }, [currentLineId, debouncedEmitLine, isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (socket?.connected && currentLineId) {
      const currentLine = lines[currentLineId];
      if (currentLine) {
        socket.emit('drawComplete', { roomId, lineId: currentLineId, line: currentLine, sender: socket.id });
      }
    }
    
    setCurrentLineId(null);
  }, [currentLineId, isDrawing, lines, roomId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleWhiteboardLine = (data) => {
      if (data.sender === socket.id || data.roomId !== roomId) return;
      setLines(prev => ({ ...prev, [data.lineId]: data.line }));
    };

    const handleDrawComplete = (data) => {
      if (data.sender === socket.id || data.roomId !== roomId) return;
      setLines(prev => ({ ...prev, [data.lineId]: data.line }));
    };

    socket.on('whiteboardLine', handleWhiteboardLine);
    socket.on('drawComplete', handleDrawComplete);

    return () => {
      socket.off('whiteboardLine', handleWhiteboardLine);
      socket.off('drawComplete', handleDrawComplete);
    };
  }, [roomId, socket]);

  return (
    <div className="relative bg-white rounded-lg shadow-xl p-4 w-full">
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
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{ background: '#ffffff' }}
        >
          <Layer>
            {Object.values(lines).map((line, i) => (
              <Line
                key={`${line.userId}-${i}`}
                points={line.points || []}
                stroke={line.color || '#000000'}
                strokeWidth={line.width || 2}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>

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
