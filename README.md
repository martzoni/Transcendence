# Transcendence

A multiplayer Pong game with modern features such as WebSocket communication, blockchain integration, and AI opponents.

## 📸 Demo

![Transcendence Demo](.github/demo.gif)

## 🚀 Features

- Real-time multiplayer gameplay using WebSockets
- Blockchain-based score tracking
- AI-powered bot opponents
- User authentication and profiles
- Leaderboards and tournaments
- Responsive UI with Three.js for 3D visuals

## 🛠 Tech Stack

- **Backend**: Django, Django REST Framework, Channels (WebSocket)
- **Frontend**: HTML, CSS, JavaScript, Three.js
- **Blockchain**: Ethereum (Ganache, ethers.js)
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

## 📦 Project Structure

```
ft_transcendence/
├── pong/                     # Frontend game logic (Three.js)
│   ├── threeJS/              # 3D game components
│   ├── index.html            # Game entry point
│   └── styles.css            # Game-specific styles
├── website/                  # Backend logic
│   ├── srcs/
│   │   ├── game/             # Game-related APIs
│   │   ├── users/            # User management
│   │   ├── tournaments/      # Tournament management
│   │   ├── leaderboards/     # Leaderboard APIs
│   │   └── transendence/     # Core Django app
├── Blockchain/               # Blockchain integration
│   ├── srcs/                 # Smart contract deployment scripts
│   └── contracts/            # Solidity contracts
├── docker-compose.yml        # Docker configuration
└── README.md                 # Project documentation
```

## 🚦 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js and npm
- Python 3.9+
- PostgreSQL
- Ganache (for blockchain testing)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd ft_transcendence
```

2. Build and start the Docker containers
```bash
docker-compose up --build
```

3. Access the application
- Frontend: [http://localhost](http://localhost)
- Backend API: [http://localhost/api](http://localhost/api)

### Running the Blockchain
1. Start Ganache
```bash
docker-compose up blockchain
```

2. Deploy the smart contract
```bash
cd Blockchain/srcs
node deploy.js
```

## 🎮 Controls

- `W` : Move paddle up
- `S` : Move paddle down
- `Mouse` : Navigate menus
- `ESC` : Exit game

## 📝 License

This project is part of the 42 school curriculum and has been made in collaboration with @kazuma3845 and @NeahNoa.
