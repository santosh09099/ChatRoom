const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use(bodyParser.json());

const SECRET_KEY = 'your_secret_key';

// MySQL connection configuration
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: 'santosh1432', // Your MySQL password
    database: 'santosh' // Your database name
});

// Promisify for Node.js async/await.
const promisePool = pool.promise();

// To keep track of connected users
let connectedUsers = {};

app.post('/register', async(req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
            return res.send('Username already taken');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await promisePool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.send('Registration successful');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

app.post('/login', async(req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({ username }, SECRET_KEY);
            res.json({ success: true, token: accessToken });
        } else {
            res.json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

io.on('connection', socket => {
    console.log('New user connected');

    socket.on('join-chat', async({ username, token }) => {
        if (!token) {
            return socket.emit('unauthorized', 'Token is required');
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            if (decoded.username === username) {
                socket.username = username;
                connectedUsers[username] = socket.id;

                // Update all clients with the current list of users
                const userList = Object.keys(connectedUsers);
                io.emit('user-list', userList);

                console.log(`User ${username} joined the chat`);
            } else {
                socket.emit('unauthorized', 'Invalid username');
            }
        } catch (error) {
            console.error(error);
            socket.emit('unauthorized', 'Invalid token');
        }
    });

    socket.on('send-message', data => {
        // Include the sender's username with the message
        const messageData = {
            username: socket.username,
            message: data.message
        };
        io.emit('receive-message', messageData);
    });

    socket.on('logout', username => {
        if (connectedUsers[username]) {
            delete connectedUsers[username];
            // Update all clients with the new list of users
            const userList = Object.keys(connectedUsers);
            io.emit('user-list', userList);
        }
        socket.disconnect();
        console.log('User logged out:', username);
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            delete connectedUsers[socket.username];
            // Update all clients with the new list of users
            const userList = Object.keys(connectedUsers);
            io.emit('user-list', userList);
        }
        console.log('User disconnected');
    });
});

//server

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});