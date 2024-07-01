const express = require("express");
const path = require("path");
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Kết Nối với database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat_app'
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL connected");
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '100mb' }));

const sessionMiddleware = session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});

app.use(sessionMiddleware);

// chia sẽ session lên sockets
io.use(sharedSession(sessionMiddleware, {
    autoSave: true
}));

// Routes
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get("/register", function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post("/register", function (req, res) {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err, result) => {
            if (err) {
                res.send(`
                    <html>
                    <head>
                        <script type="text/javascript">
                            alert('Tên đăng nhập đã tồn tại');
                            window.location.href = '/';
                        </script>
                    </head>
                    <body></body>
                    </html>
                `);
            } else {
                res.redirect('/');
            }
        });
    });
});

app.post("/login", function (req, res) {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            bcrypt.compare(password, results[0].password, (err, match) => {
                if (err) throw err;
                if (match) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/chat');
                } else {
                    res.send(`
                        <html>
                        <head>
                            <script type="text/javascript">
                                alert('Mật khẩu không chính xác');
                                window.location.href = '/';
                            </script>
                        </head>
                        <body></body>
                        </html>
                    `);
                }
            });
        } else {
            res.send(`
                <html>
                <head>
                    <script type="text/javascript">
                        alert('Tên đăng nhập không chính xác');
                        window.location.href = '/';
                    </script>
                </head>
                <body></body>
                </html>
            `);
        }
    });
});

app.get("/chat", function (req, res) {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'chat.html'));
    } else {
        res.redirect('/');
    }
});

io.on('connection', function (socket) {
    if (socket.handshake.session.loggedin) {
        socket.emit('username', socket.handshake.session.username);
    }

    socket.on('send', function (data) {
        console.log("Received data: ", data);
        if (data.type === 'file') {
            const matches = data.message.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                const ext = matches[1].split('/')[1];
                const filename = `upload-${Date.now()}.${ext}`;
                const buffer = Buffer.from(matches[2], 'base64');

                fs.writeFile(path.join(__dirname, 'public', 'uploads', filename), buffer, (err) => {
                    if (err) {
                        console.error(err);
                    } else {
                        data.message = `/uploads/${filename}`;
                        console.log("File saved: ", data.message);
                        io.sockets.emit('send', data);
                    }
                });
            } else {
                console.error("Invalid file data");
            }
        } else {
            io.sockets.emit('send', data);
        }
    });
});

server.listen(3000, function () {
    console.log("Server is listening on port 3000");
});
