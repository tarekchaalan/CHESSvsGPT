# ♟︎ CHESSvsGPT ♟️

A web-based chess game where you can play against different OpenAI models. The game features a beautiful chess interface and allows you to choose between various AI models for different levels of challenge.

## Live Demo

Play the game online at [chess-vs-gpt.vercel.app](https://chess-vs-gpt.vercel.app/)

## Features

- Play chess against different OpenAI models (GPT-4.5, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo)
- Beautiful and responsive chess interface
- Game controls (Restart, Undo Move, Flip Board)
- Secure API key management
- Illegal move detection and handling
- ASCII board representation for AI decision making
- Responsive design for all device sizes

## Credits

This project uses two amazing open-source libraries:

- [chessboard.js](https://github.com/oakmac/chessboardjs) - For the chess board interface
- [chess.js](https://github.com/jhlywa/chess.js) - For chess logic and move validation

## How It Works

1. The game uses chessboard.js to render the chess board and handle piece movement
2. chess.js manages the game state, validates moves, and handles chess rules
3. When it's the AI's turn, the current board position is sent to OpenAI's API
4. The AI receives:
   - The current FEN (Forsyth–Edwards Notation) position
   - An ASCII representation of the board
   - Game state information (check, checkmate, etc.)
   - Clear instructions about legal moves
5. The AI responds with a move in SAN (Standard Algebraic Notation) format
6. The move is validated and executed on the board
7. If the AI makes an illegal move, it's given another chance with more specific instructions

## Local Setup

1. Clone the repository:

```bash
git clone https://github.com/tarekchaalan/CHESSvsGPT.git
cd CHESSvsGPT
```

2. Serve the website using a local server:

```bash
# Using Python
python -m http.server 3000

# Using Node.js
npx serve
```

3. Open https://localhost:3000/ (or whatever port was used when serving)

4. Get an OpenAI API key from [OpenAI's website](https://platform.openai.com/api-keys)

5. Click "Manage API Key" in the game and enter your API key

6. Select your preferred AI model and start playing!

## Requirements

- OpenAI API key
- Internet connection

## License

MIT License - See [LICENSE](LICENSE) file for details
