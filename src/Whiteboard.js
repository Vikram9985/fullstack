import React, { useRef, useEffect, useState } from 'react';
import Toolbar from './Toolbar';

/*
  Whiteboard Component

  Responsibilities:
  - Render an HTML canvas and a toolbar to create and manipulate shapes.
  - Maintain an array of `shapes` in React state. Each shape is a plain JS object
    with properties like { id, type, x, y, width, height, radius, points, pageId }.
  - Sync newly created shapes with a backend API when available. Falls back to
    localStorage for persistence when backend is not reachable.

  High-level data flow:
  - On mount, attempt to fetch shapes for `pageId` from backend; otherwise load
    from localStorage.
  - User actions (add shape, pencil stroke, drag) update `shapes` state and
    persist changes to localStorage and the backend (POST/PUT).

  Notes:
  - Canvas rendering uses devicePixelRatio scaling for crisp lines on HiDPI displays.
  - Hit-testing is approximate for non-rectangular shapes: suitable for a demo
    but should be improved for production (e.g., using path2D or per-shape math).
*/

const API_ROOT = process.env.REACT_APP_API_ROOT || 'http://localhost:4000';

function uid(prefix = 'shape') {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [shapes, setShapes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [current, setCurrent] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [pageId] = useState('page_1');

  // Load shapes from backend (page-specific) or localStorage
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_ROOT}/api/pages/${pageId}/shapes`);
        if (res.ok) {
          const data = await res.json();
          setShapes(data);
          localStorage.setItem('shapes', JSON.stringify(data));
          return;
        }
      } catch (e) {
        // ignore, fallback
      }
      const saved = localStorage.getItem('shapes');
      if (saved) setShapes(JSON.parse(saved));
    }
    load();
  }, [pageId]);

  useEffect(() => {
    draw();
  }, [shapes]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // clear using device pixels then scale for crisp lines
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
    shapes.forEach(s => {
      ctx.save();
      ctx.translate(s.x || 0, s.y || 0);
      if (s.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, s.radius || 30, 0, Math.PI * 2);
        ctx.fillStyle = s.color || 'rgba(0,0,0,0.05)';
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
      } else if (s.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s.x2 - s.x, s.y2 - s.y);
        ctx.strokeStyle = 'black';
        ctx.stroke();
      } else if (s.type === 'arrow') {
        const x2 = s.x2 - s.x;
        const y2 = s.y2 - s.y;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // arrow head
        const angle = Math.atan2(y2, x2);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = 'black';
        ctx.fill();
      } else if (s.type === 'pencil') {
        ctx.beginPath();
        const pts = s.points || [];
        if (pts.length > 0) {
          ctx.moveTo(pts[0].x - s.x, pts[0].y - s.y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x - s.x, pts[i].y - s.y);
          }
        }
        ctx.stroke();
      } else if (s.type === 'text') {
        ctx.fillStyle = s.color || '#000';
        ctx.font = `${s.fontSize || 16}px ${s.fontFamily || 'Arial'}`;
        ctx.textBaseline = 'top';
        ctx.fillText(s.content || '', 0, 0);
      } else {
        // default rectangle
        ctx.fillStyle = s.color || 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, s.width || 60, s.height || 40);
        ctx.strokeRect(0, 0, s.width || 60, s.height || 40);
      }
      ctx.restore();
      // draw selection box
      if (selectedId === s.id) {
        // draw selection in CSS pixels (transform already handled)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.strokeStyle = '#0ea5a4';
        ctx.lineWidth = 1;
        const w = s.width || (s.radius ? s.radius * 2 : 60);
        const h = s.height || (s.radius ? s.radius * 2 : 40);
        ctx.strokeRect(s.x - 6, s.y - 6, w + 12, h + 12);
        ctx.restore();
      }
    });
  }

  // Helpers
  function addShape(type) {
    const s = {
      id: uid('shape'),
      type,
      x: 100 + Math.random() * 200,
      y: 80 + Math.random() * 200,
      pageId,
    };
    if (type === 'circle') s.radius = 30;
    if (type === 'line' || type === 'arrow') {
      s.x2 = s.x + 80;
      s.y2 = s.y + 0;
    }
    if (type === 'text') {
      s.content = 'Text';
      s.fontSize = 16;
    }
    setShapes(prev => {
      const next = [...prev, s];
      localStorage.setItem('shapes', JSON.stringify(next));
      return next;
    });
    // POST to backend
    fetch(`${API_ROOT}/api/shapes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }).catch(() => {});
  }

  // Mouse interactions
  function getPointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function findShapeAt(point) {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === 'circle') {
        const dx = point.x - s.x;
        const dy = point.y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) <= (s.radius || 30)) return s;
      } else if (s.type === 'line' || s.type === 'arrow') {
        // bounding box for line
        const minX = Math.min(s.x, s.x2);
        const maxX = Math.max(s.x, s.x2);
        const minY = Math.min(s.y, s.y2);
        const maxY = Math.max(s.y, s.y2);
        if (point.x >= minX - 6 && point.x <= maxX + 6 && point.y >= minY - 6 && point.y <= maxY + 6) return s;
      } else if (s.type === 'pencil') {
        // approximate
        const pts = s.points || [];
        if (pts.length === 0) continue;
        const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        pts.forEach(p => { bbox.minX = Math.min(bbox.minX, p.x); bbox.minY = Math.min(bbox.minY, p.y); bbox.maxX = Math.max(bbox.maxX, p.x); bbox.maxY = Math.max(bbox.maxY, p.y); });
        if (point.x >= bbox.minX && point.x <= bbox.maxX && point.y >= bbox.minY && point.y <= bbox.maxY) return s;
      } else {
        const w = s.width || 60;
        const h = s.height || 40;
        if (point.x >= s.x && point.x <= s.x + w && point.y >= s.y && point.y <= s.y + h) return s;
      }
    }
    return null;
  }

  const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0, shapeId: null });

  function handleMouseDown(e) {
    const p = getPointerPos(e);
    if (tool === 'pencil') {
      setIsDrawing(true);
      const s = { id: uid('shape'), type: 'pencil', x: p.x, y: p.y, points: [{ x: p.x, y: p.y }], pageId };
      setCurrent(s);
      return;
    }
    if (tool === 'text') {
      const text = prompt('Enter text');
      if (text) {
        const s = { id: uid('shape'), type: 'text', content: text, x: p.x, y: p.y, pageId };
        setShapes(prev => { const next = [...prev, s]; localStorage.setItem('shapes', JSON.stringify(next)); return next; });
        fetch(`${API_ROOT}/api/shapes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }).catch(() => {});
      }
      return;
    }

    const hit = findShapeAt(p);
    if (hit) {
      setSelectedId(hit.id);
      dragState.current.dragging = true;
      dragState.current.shapeId = hit.id;
      dragState.current.offsetX = p.x - hit.x;
      dragState.current.offsetY = p.y - hit.y;
    } else {
      setSelectedId(null);
    }
  }

  function handleMouseMove(e) {
    const p = getPointerPos(e);
    if (tool === 'pencil' && isDrawing && current) {
      setCurrent(prev => ({ ...prev, points: [...prev.points, { x: p.x, y: p.y }] }));
      return;
    }
    if (dragState.current.dragging) {
      const id = dragState.current.shapeId;
      setShapes(prev => {
        const next = prev.map(s => {
          if (s.id !== id) return s;
          const nx = p.x - dragState.current.offsetX;
          const ny = p.y - dragState.current.offsetY;
          return { ...s, x: nx, y: ny };
        });
        localStorage.setItem('shapes', JSON.stringify(next));
        return next;
      });
    }
  }

  function handleMouseUp(e) {
    const p = getPointerPos(e);
    if (tool === 'pencil' && isDrawing && current) {
      // finalize pencil
      const final = { ...current };
      setShapes(prev => {
        const next = [...prev, final];
        localStorage.setItem('shapes', JSON.stringify(next));
        return next;
      });
      fetch(`${API_ROOT}/api/shapes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(final) }).catch(() => {});
      setCurrent(null);
      setIsDrawing(false);
      return;
    }
    if (dragState.current.dragging) {
      // commit update to backend
      const id = dragState.current.shapeId;
      const s = shapes.find(x => x.id === id);
      if (s) fetch(`${API_ROOT}/api/shapes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }).catch(() => {});
      dragState.current.dragging = false;
      dragState.current.shapeId = null;
    }
  }

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resizeCanvas() {
      const clientW = canvas.clientWidth;
      const clientH = 480; // fixed height in CSS pixels
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(clientW * ratio);
      canvas.height = Math.floor(clientH * ratio);
      canvas.style.height = clientH + 'px';
      // after resizing, redraw
      draw();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div>
      <div className="canvas-wrapper">
        <Toolbar tool={tool} setTool={setTool} addShape={addShape} />
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            style={{ width: '100%', display: 'block', borderRadius: 6 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}>
        <strong>Shapes</strong>
        <div className="shapes-list">
          <ul>
            {shapes.map(s => (
              <li key={s.id} style={{ cursor: 'pointer', padding: '6px 0' }} onClick={() => setSelectedId(s.id)}>{s.type} — {s.id}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
