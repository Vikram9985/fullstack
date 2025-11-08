import React from 'react';
import './App.css';
import Whiteboard from './Whiteboard';

/**
 * App
 * Root application component. Keeps layout minimal: header + whiteboard area.
 * The heavy lifting is performed inside `Whiteboard`.
 */
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Mini Excalidraw - Whiteboard</h1>
      </header>
      <main>
        <Whiteboard />
      </main>
    </div>
  );
}

export default App;
