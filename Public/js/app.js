// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkCF3ymFmQnwGF-jZ1n6rQirsLHI1Kao4",
  authDomain: "safe-chat-6eef1.firebaseapp.com",
  databaseURL: "https://safe-chat-6eef1-default-rtdb.firebaseio.com",
  projectId: "safe-chat-6eef1",
  storageBucket: "safe-chat-6eef1.firebasestorage.app",
  messagingSenderId: "1085710211274",
  appId: "1:1085710211274:web:d52d361b337e70d36ebc33"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const googleLoginBtn = document.getElementById('google-login-btn');

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Login with Email/Password
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = 'chat.html';
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Sign Up with Email/Password
signupBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // Create user profile in Firestore
            const user = auth.currentUser;
            return db.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0],
                photoURL: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            window.location.href = 'chat.html';
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Login with Google
googleLoginBtn.addEventListener('click', () => {
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            const user = result.user;
            
            // Check if user is new
            if (result.additionalUserInfo.isNewUser) {
                return db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .then(() => {
            window.location.href = 'chat.html';
        })
        .catch((error) => {
            alert(error.message);
        });
});

// Check Auth State
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        if (window.location.pathname.includes('index.html')) {
            window.location.href = 'chat.html';
        }
    } else {
        // No user signed in
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    }
});

// Logout Function
function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            alert(error.message);
        });
}

// Export for use in chat.js
export { auth, db, storage, logout };
