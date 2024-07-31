const socket = io();

const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const chatContainer = document.getElementById('chat-container');

const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const registerLink = document.getElementById('register-link');

const regUsernameInput = document.getElementById('reg-username-input');
const regPasswordInput = document.getElementById('reg-password-input');
const registerButton = document.getElementById('register-button');
const loginLink = document.getElementById('login-link');

const messageContainer = document.getElementById('message-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const logoutButton = document.getElementById('logout-button');
const userList = document.getElementById('user-list');

let username = '';
let token = '';

// Event listener for login
loginButton.addEventListener('click', () => {
    username = usernameInput.value.trim(); // Assign to global username variable
    const password = passwordInput.value.trim();
    if (username !== '' && password !== '') {
        fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    token = data.token;
                    socket.emit('join-chat', { username, token });
                    loginContainer.style.display = 'none';
                    chatContainer.style.display = 'block';
                } else {
                    alert(data.message);
                }
            });
    }
});

registerLink.addEventListener('click', () => {
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
});

registerButton.addEventListener('click', () => {
    const username = regUsernameInput.value.trim();
    const password = regPasswordInput.value.trim();
    if (username !== '' && password !== '') {
        fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
                if (data === 'Registration successful') {
                    registerContainer.style.display = 'none';
                    loginContainer.style.display = 'block';
                }
            });
    }
});

loginLink.addEventListener('click', () => {
    registerContainer.style.display = 'none';
    loginContainer.style.display = 'block';
});

sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message !== '') {
        socket.emit('send-message', { message, username });
        messageInput.value = '';
    }
});

logoutButton.addEventListener('click', () => {
    socket.emit('logout', username);
    username = '';
    token = '';
    loginContainer.style.display = 'block';
    chatContainer.style.display = 'none';
});

socket.on('user-list', users => {
    userList.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.innerText = user;
        userList.append(userElement);
    });
});

socket.on('load-messages', messages => {
    messageContainer.innerHTML = '';
    messages.forEach(data => {
        addMessage(data);
    });
});

socket.on('receive-message', data => {
    addMessage(data);
});

socket.on('unauthorized', message => {
    alert(message);
    username = '';
    token = '';
    loginContainer.style.display = 'block';
    chatContainer.style.display = 'none';
});

function addMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.innerText = `${data.username}: ${data.message}`;
    messageContainer.append(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}