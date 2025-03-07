// Initialize Gun and the user instance for authentication
const gun = Gun();
const gunUser = gun.user();

// Node to store posts; note that posts are public even though users are authenticated
const postsNode = gun.get('GeeXYZ-posts');

// --- Authentication Handlers ---

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
      // Clear the signup form
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
      // Hide auth forms and display the app content
      document.getElementById('auth').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      document.getElementById('userInfo').style.display = 'block';
      document.getElementById('currentUser').textContent = alias;
      // Clear the login form
      document.getElementById('loginForm').reset();
    }
  });
});

// Handle Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  gunUser.leave();
  // Hide the app content and show auth forms again
  document.getElementById('auth').style.display = 'block';
  document.getElementById('appContent').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
});

// --- Post Handling ---

// Function to add a post to the page
function addPost(post) {
  const postsDiv = document.getElementById('posts');
  const postDiv = document.createElement('div');
  postDiv.classList.add('post');
  postDiv.id = post.id;
  
  // Create element to show the author
  const authorEl = document.createElement('strong');
  authorEl.textContent = post.author ? post.author + " says:" : "Anonymous:";
  postDiv.appendChild(authorEl);

  // Create content element
  const contentEl = document.createElement('p');
  contentEl.textContent = post.message;
  postDiv.appendChild(contentEl);

  // If there is an image, add it
  if (post.imageUrl) {
    const imageEl = document.createElement('img');
    imageEl.src = post.imageUrl;
    postDiv.appendChild(imageEl);
  }
  
  // Create vote controls
  const votesDiv = document.createElement('div');
  votesDiv.classList.add('votes');
  
  // Upvote button
  const upvoteBtn = document.createElement('button');
  upvoteBtn.textContent = `Upvote (${post.upvotes || 0})`;
  upvoteBtn.addEventListener('click', () => {
    updateVote(post.id, 'upvote');
  });
  votesDiv.appendChild(upvoteBtn);

  // Downvote button
  const downvoteBtn = document.createElement('button');
  downvoteBtn.textContent = `Downvote (${post.downvotes || 0})`;
  downvoteBtn.addEventListener('click', () => {
    updateVote(post.id, 'downvote');
  });
  votesDiv.appendChild(downvoteBtn);
  
  postDiv.appendChild(votesDiv);
  postsDiv.prepend(postDiv);
}

// Helper to update votes for a given post
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

// Listen for new posts added to Gun and display them
postsNode.map().on((data, key) => {
  if (data && !document.getElementById(key)) {
    data.id = key;
    addPost(data);
  }
});

// Handle the post form submission (only available to logged in users)
document.getElementById('postForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const message = document.getElementById('message').value;
  const imageUrl = document.getElementById('imageUrl').value;
  const author = document.getElementById('currentUser').textContent; // logged in user
  
  const postData = {
    message,
    imageUrl: imageUrl || '',
    upvotes: 0,
    downvotes: 0,
    timestamp: Date.now(),
    author
  };

  // Create a new post in Gun
  postsNode.set(postData);

  // Clear form inputs
  document.getElementById('postForm').reset();
});
