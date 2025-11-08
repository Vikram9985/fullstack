import React from 'react';

/**
 * Toolbar
 *
 * Props:
 * - tool: current selected tool (string)
 * - setTool: function to set the active tool
 * - addShape: function to append a new shape to the whiteboard
 *
 * The toolbar presents a small set of tool buttons. Buttons use the `.btn`
 * CSS class from `App.css` and set `aria-pressed` for accessibility.
 */
export default function Toolbar({ tool, setTool, addShape }) {
  const btn = (label, onClick, name) => (
    <button
      className={`btn ${tool === name ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={tool === name}
    >
      {label}
    </button>
  );

  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      {btn('Select', () => setTool('select'), 'select')}
      {btn('✏️ Pencil', () => setTool('pencil'), 'pencil')}
      <div style={{ width: 8 }} />
      {/* Quick-add shape buttons call addShape(type) to create simple shapes */}
      <button className="btn" onClick={() => addShape('line')}>— Line</button>
      <button className="btn" onClick={() => addShape('circle')}>○ Circle</button>
      <button className="btn" onClick={() => addShape('arrow')}>→ Arrow</button>
      <div style={{ width: 12 }} />
      {btn('T Text', () => setTool('text'), 'text')}
    </div>
  );
}
