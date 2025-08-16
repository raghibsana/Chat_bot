import { auth, db, storage, logout } from './app.js';

// DOM Elements
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const mediaBtn = document.getElementById('media-btn');
const profileBtn = document.getElementById('profile-btn');
const logoutBtn = document.getElementById('logout-btn');
const cameraBtn = document.getElementById('camera-btn');
const closeCameraBtn = document.getElementById('close-camera');
const captureBtn = document.getElementById('capture-btn');
const flipCameraBtn = document.getElementById('flip-camera');
const cameraView = document.getElementById('camera-view');
const cameraPreview = document.getElementById('camera-preview');
const storiesScroll = document.getElementById('stories-scroll');
const chatList = document.getElementById('chat-list');

// Current User
let currentUser = auth.currentUser;

// Camera Stream
let stream = null;

// Load Chats
function loadChats() {
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('lastUpdated', 'desc')
        .onSnapshot((snapshot) => {
            chatList.innerHTML = '';
            snapshot.forEach((doc) => {
                const chat = doc.data();
                renderChat(chat);
            });
        });
}

// Render Chat Item
function renderChat(chat) {
    const otherUser = chat.participants.find(uid => uid !== currentUser.uid);
    
    db.collection('users').doc(otherUser).get()
        .then((doc) => {
            const user = doc.data();
            
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <img src="${user.photoURL || 'images/default-avatar.png'}" class="chat-avatar" alt="${user.displayName}">
                <div class="chat-info">
                    <div class="chat-name">${user.displayName}</div>
                    <div class="chat-preview">${chat.lastMessage || 'No messages yet'}</div>
                </div>
                <div class="chat-time">${formatTime(chat.lastUpdated?.toDate())}</div>
            `;
            
            chatList.appendChild(chatItem);
        });
}

// Load Messages
function loadMessages(chatId) {
    db.collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesDiv.innerHTML = '';
            snapshot.forEach((doc) => {
                const message = doc.data();
                renderMessage(message);
            });
            
            // Scroll to bottom
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

// Render Message
function renderMessage(message) {
    const isCurrentUser = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    
    if (message.type === 'text') {
        messageElement.innerHTML = `
            <p>${message.text}</p>
            <div class="message-time">${formatTime(message.timestamp?.toDate())}</div>
        `;
    } else if (message.type === 'image') {
        messageElement.innerHTML = `
            <img src="${message.mediaUrl}" class="message-image">
            <div class="message-time">${formatTime(message.timestamp?.toDate())}</div>
        `;
    }
    
    messagesDiv.appendChild(messageElement);
}

// Send Message
function sendMessage(chatId, text) {
    db.collection('messages').add({
        chatId: chatId,
        senderId: currentUser.uid,
        text: text,
        type: 'text',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update chat last message
    db.collection('chats').doc(chatId).update({
        lastMessage: text,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// Send Image
function sendImage(chatId, file) {
    const storageRef = storage.ref(`chat-media/${currentUser.uid}/${Date.now()}`);
    
    storageRef.put(file)
        .then((snapshot) => {
            return snapshot.ref.getDownloadURL();
        })
        .then((url) => {
            return db.collection('messages').add({
                chatId: chatId,
                senderId: currentUser.uid,
                mediaUrl: url,
                type: 'image',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            // Update chat last message
            db.collection('chats').doc(chatId).update({
                lastMessage: '📷 Photo',
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
}

// Load Stories
function loadStories() {
    db.collection('stories')
        .where('timestamp', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            storiesScroll.innerHTML = '';
            snapshot.forEach((doc) => {
                const story = doc.data();
                renderStory(story);
            });
        });
}

// Render Story
function renderStory(story) {
    db.collection('users').doc(story.userId).get()
        .then((userDoc) => {
            const user = userDoc.data();
            
            const storyElement = document.createElement('div');
            storyElement.className = 'story-circle';
            storyElement.innerHTML = `
                <div class="story-inner">
                    <img src="${story.mediaUrl}" alt="${user.displayName}'s story">
                </div>
            `;
            
            storiesScroll.appendChild(storyElement);
        });
}

// Camera Functions
async function openCamera() {
    try {
        cameraView.classList.remove('hidden');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
        cameraPreview.srcObject = stream;
    } catch (err) {
        console.error('Camera error:', err);
        alert('Could not access camera');
    }
}

function closeCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    cameraView.classList.add('hidden');
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    canvas.getContext('2d').drawImage(cameraPreview, 0, 0);
    
    canvas.toBlob((blob) => {
        const file = new File([blob], 'snap.jpg', { type: 'image/jpeg' });
        // Here you would send the photo to a chat or story
        closeCamera();
    }, 'image/jpeg', 0.9);
}

function flipCamera() {
    // Implementation for flipping camera would go here
    console.log('Flip camera');
}

// Helper Functions
function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Event Listeners
sendBtn.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        // In a real app, you would specify which chat to send to
        sendMessage('CHAT_ID_HERE', message);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

mediaBtn.addEventListener('click', () => {
    // Implement media picker
    console.log('Media button clicked');
});

profileBtn.addEventListener('click', () => {
    // Show profile modal
    console.log('Profile button clicked');
});

logoutBtn.addEventListener('click', logout);

cameraBtn.addEventListener('click', openCamera);
closeCameraBtn.addEventListener('click', closeCamera);
captureBtn.addEventListener('click', capturePhoto);
flipCameraBtn.addEventListener('click', flipCamera);

// Initialize
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadChats();
        loadStories();
        
        // Set user avatar in header
        const userAvatar = document.getElementById('user-avatar');
        if (user.photoURL) {
            userAvatar.src = user.photoURL;
        }
    }
});
