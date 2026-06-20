# JettMessage

JettMessage is a real-time, end-to-end chat application focused on reliable message delivery and a responsive messaging experience. It combines WebSocket-based real-time transport with at-least-once delivery semantics, end-to-end encryption, presence tracking, and offline message queuing.

## Features

- **Real-time messaging** — Instant message delivery over WebSockets.
- **At-least-once delivery** — Client-side idempotency keys prevent duplicate messages even on retries or reconnects.
- **End-to-end encryption** — Messages are encrypted so only the intended participants can read them.
- **Presence system** — Redis-backed online/offline/typing presence indicators.
- **Offline message queue** — BullMQ-powered queue ensures messages are delivered once a recipient comes back online.
- **Persistent storage** — PostgreSQL for durable storage of users, conversations, and messages.

## Tech Stack

| Layer        | Technology                          |
|--------------|--------------------------------------|
| Frontend     | React, TypeScript                    |
| Backend      | Node.js, TypeScript/JavaScript       |
| Database     | PostgreSQL                           |
| Cache / Presence | Redis                            |
| Job Queue    | BullMQ                               |
| Realtime     | WebSockets                           |

## Project Structure

```
JettMessage/
├── backend/     # Node.js API, WebSocket server, queue workers, DB layer
├── frontend/    # React client application
└── .gitignore
```

## Prerequisites

Before running JettMessage locally, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Tusharsoni3/JettMessage.git
cd JettMessage
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the required configuration, for example:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/jettmessage
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

> Adjust the variable names above to match what's defined in the backend source — update this section once the exact `.env` keys used by the app are confirmed.

Run database migrations (if applicable), then start the backend:

```bash
npm run dev
```

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
```

### 4. Open the app

By default, the frontend should be available at `http://localhost:3000` (or whichever port your dev server reports), with the backend API/WebSocket server running separately (e.g. `http://localhost:5000`).

## How It Works (High Level)

1. Clients connect to the backend over a WebSocket connection.
2. Outgoing messages are tagged with a client-generated idempotency key, so retried sends are deduplicated server-side.
3. Messages are encrypted end-to-end before leaving the sender's client.
4. Redis tracks which users are currently online, enabling live presence updates.
5. If a recipient is offline, the message is placed on a BullMQ queue and delivered once they reconnect.
6. PostgreSQL persists conversation and message history for retrieval across sessions.

## Roadmap Ideas

- Group chats
- Read receipts
- Message search
- File/media attachments

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

## License

No license has been specified yet for this repository. Consider adding one (e.g. MIT) to clarify usage rights.
