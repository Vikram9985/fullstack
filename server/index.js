const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory storage used for the take-home assignment. This keeps the code
// simple and avoids a database dependency. Data will be lost when the server
// restarts, which is acceptable for the assignment.
let pages = [ { id: 'page_1', name: 'Page 1' } ];
let shapes = []; // each shape must include a `pageId`

// Helper: return only the shapes that belong to a specific page
function shapesForPage(pageId) {
  return shapes.filter(s => s.pageId === pageId);
}

// ---------------------- Pages endpoints ----------------------
// GET /api/pages
//   Returns the list of pages
app.get('/api/pages', (req, res) => {
  res.json(pages);
});

// POST /api/pages
//   Body: { name }
//   Creates a new page and returns it.
app.post('/api/pages', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const page = { id: 'page_' + uuidv4(), name };
  pages.push(page);
  res.status(201).json(page);
});

// DELETE /api/pages/:id
//   Deletes the page and any shapes that belonged to it.
app.delete('/api/pages/:id', (req, res) => {
  const id = req.params.id;
  pages = pages.filter(p => p.id !== id);
  shapes = shapes.filter(s => s.pageId !== id);
  res.status(204).end();
});

// GET /api/pages/:id/shapes
//   Returns shapes for a specific page.
app.get('/api/pages/:id/shapes', (req, res) => {
  const pageId = req.params.id;
  res.json(shapesForPage(pageId));
});

// ---------------------- Shapes endpoints ----------------------
// GET /api/shapes
//   Return all shapes (across pages). Useful for debugging.
app.get('/api/shapes', (req, res) => {
  res.json(shapes);
});

// POST /api/shapes
//   Create a shape. The request body should include at least: type, x, y, pageId
//   The server assigns an id if not provided.
app.post('/api/shapes', (req, res) => {
  const shape = req.body;
  shape.id = shape.id || 'shape_' + uuidv4();
  shapes.push(shape);
  res.status(201).json(shape);
});

// PUT /api/shapes/:id
//   Update a shape's properties (x/y/width/height/rotation/etc.). Returns the
//   updated shape or 404 if not found.
app.put('/api/shapes/:id', (req, res) => {
  const id = req.params.id;
  const idx = shapes.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  shapes[idx] = { ...shapes[idx], ...req.body };
  res.json(shapes[idx]);
});

// DELETE /api/shapes/:id
//   Remove a shape by id
app.delete('/api/shapes/:id', (req, res) => {
  const id = req.params.id;
  shapes = shapes.filter(s => s.id !== id);
  res.status(204).end();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
