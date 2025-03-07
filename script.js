// Initialize Gun and the user instance for authentication
const gun = Gun();
const gunUser = gun.user();

// Node to store posts; posts are public but encrypted
const postsNode = gun.get('GeeXYZ-posts');

// A shared secret for demo purposes – every client must use the same key to decrypt.
// In production, you would want a per-group or per-message key exchange.
const sharedSecret = "my-super-secret-key";

// --- Authentication Handlers (same as before) ---

// Handle Signup
document.getElementById('signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const alias = document.getElementById('signupAlias').value;
  const password = document.getElementById('signupPassword').value;
  
  gunUser.create(alias, password, (ack) => {
    if (ack.err) {
      alert("Signup error: " + ack.err);
    } else {
      alert("Account created successfully! Please log in.");
      document.getElementById('signupForm').reset();
    }
  });
});

// Handle Login
document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const alias = document.getElementById('loginAlias').value;
  const password = document.getElementById('loginPassword').value;
  
  gunUser.auth(alias, password, (ack) => {
    if (ack.err) {
      alert("Login error: " + ack.err);
    } else {
      document.getElementById('auth').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      document.getElementById('userInfo').style.display = 'block';
      document.getElementById('currentUser').textContent = alias;
      document.getElementById('loginForm').reset();
    }
  });
});

// Handle Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  gunUser.leave();
  document.getElementById('auth').style.display = 'block';
  document.getElementById('appContent').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
});

// --- Posting with End-to-End Encryption ---

// When a user submits a post, encrypt the message first.
document.getElementById('postForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const message = document.getElementById('message').value;
  const imageUrl = document.getElementById('imageUrl').value;
  const author = document.getElementById('currentUser').textContent; // logged in user

  // Encrypt the message with the shared secret.
  SEA.encrypt(message, sharedSecret).then(encryptedMessage => {
    const postData = {
      encryptedMessage, // store only the encrypted message
      imageUrl: imageUrl || '',
      upvotes: 0,
      downvotes: 0,
      timestamp: Date.now(),
      author
    };

    // Store the encrypted post in Gun.
    postsNode.set(postData);

    // Clear the form inputs.
    document.getElementById('postForm').reset();
  }).catch(err => {
    console.error("Encryption error: ", err);
  });
});

// Function to add a post to the page; it decrypts the encrypted message.
function addPost(post) {
  const postsDiv = document.getElementById('posts');
  const postDiv = document.createElement('div');
  postDiv.classList.add('post');
  postDiv.id = post.id;
  
  // Display the author.
  const authorEl = document.createElement('strong');
  authorEl.textContent = post.author ? post.author + " says:" : "Anonymous:";
  postDiv.appendChild(authorEl);

  // Create an element for the decrypted message.
  const contentEl = document.createElement('p');
  // Attempt to decrypt the message using the shared secret.
  SEA.decrypt(post.encryptedMessage, sharedSecret).then(plainText => {
      contentEl.textContent = plainText;
  }).catch(err => {
      console.error("Decryption error: ", err);
      contentEl.textContent = "[Encrypted message]";
  });
  postDiv.appendChild(contentEl);

  // If there is an image, display it.
  if (post.imageUrl) {
    const imageEl = document.createElement('img');
    imageEl.src = post.imageUrl;
    postDiv.appendChild(imageEl);
  }
  
  // Vote controls (upvote and downvote).
  const votesDiv = document.createElement('div');
  votesDiv.classList.add('votes');
  
  const upvoteBtn = document.createElement('button');
  upvoteBtn.textContent = `Upvote (${post.upvotes || 0})`;
  upvoteBtn.addEventListener('click', () => {
    updateVote(post.id, 'upvote');
  });
  votesDiv.appendChild(upvoteBtn);

  const downvoteBtn = document.createElement('button');
  downvoteBtn.textContent = `Downvote (${post.downvotes || 0})`;
  downvoteBtn.addEventListener('click', () => {
    updateVote(post.id, 'downvote');
  });
  votesDiv.appendChild(downvoteBtn);
  
  postDiv.appendChild(votesDiv);
  postsDiv.prepend(postDiv);
}

// Helper function to update vote counts.
function updateVote(postId, type) {
  postsNode.get(postId).once((data) => {
    let upvotes = data.upvotes || 0;
    let downvotes = data.downvotes || 0;
    if (type === 'upvote') {
      upvotes++;
    } else {
      downvotes++;
    }
    postsNode.get(postId).put({ upvotes, downvotes });
  });
}

// Listen for new posts and display them.
postsNode.map().on((data, key) => {
  if (data && !document.getElementById(key)) {
    data.id = key;
    addPost(data);
  }
});
