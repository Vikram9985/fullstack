Mini Excalidraw server

Run:

1. cd server
2. npm install
3. npm start

API:
GET /api/pages
POST /api/pages { name }
DELETE /api/pages/:id
GET /api/pages/:id/shapes

GET /api/shapes
POST /api/shapes { shape }
PUT /api/shapes/:id { updated fields }
DELETE /api/shapes/:id

Data is in-memory for the take-home task and resets when server restarts.

