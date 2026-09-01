# DevBlog — Full-Stack Web Publishing Platform

DevBlog is a modern full-stack blogging platform that enables creators to publish, edit, manage, and discover articles across topics like Sports, AI & Tech, Web Development, Gaming, and Lifestyle. Built with a responsive Single Page Application (SPA) architecture, secure token-based authentication, flexible multi-field search, and cloud deployment.

---

## 🌐 Live Application
* **Live URL:** https://insighthub-t90g.onrender.com
* **GitHub Repository:** https://github.com/Ratan-07/blog-app

---

## ✨ Features
* **User Authentication:** Secure registration and login using `bcryptjs` password hashing and stateless JSON Web Tokens (`JWT`).
* **Complete CRUD Engine:** Create, read, update, and delete blog posts with author-level authorization.
* **Smart Search & Recommendations:** Real-time, case-insensitive, space-flexible search across article titles, content, categories, and author names.
* **Category Filters:** Dynamic category filtering for Cricket, Football, Lifestyle, Career, AI & Tech, Web Dev, Gaming, and General.
* **Creator Dashboard & Profile:** Personal dashboard displaying author statistics, published post counts, and content management controls.
* **Responsive Dark UI:** Mobile-first layout with smooth transitions, custom modals, and accessible contrast.

---

## 🛠️ Tech Stack
* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (CSS Grid & Flexbox)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas (Mongoose ODM)
* **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
* **Deployment:** Render Cloud Platform

---

## 📂 Project Structure
```text
blog-app/
├── public/
│   ├── index.html        # Single Page Application views and layout
│   ├── style.css         # Custom dark-theme styling and responsive media queries
│   └── script.js         # Frontend state management, routing, and API calls
├── .gitignore
├── package.json
├── server.js             # Express server, MongoDB connection, and REST API routes
└── README.md

## 🚀 API Endpoints

### Authentication
* `POST /api/register` — Register a new account
* `POST /api/login` — Sign in and receive an authentication token
* `GET /api/profile` — Retrieve authenticated user profile *(Protected)*

### Blog Posts
* `GET /api/blogs` — Get all posts (supports `search`, `category`, and `authorEmail` queries)
* `GET /api/blogs/:id` — Get single post details
* `POST /api/blogs` — Create a new post *(Protected)*
* `PUT /api/blogs/:id` — Update an existing post *(Protected, Owner only)*
* `DELETE /api/blogs/:id` — Delete a post *(Protected, Owner only)*

---

## ⚙️ Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Ratan-07/blog-app.git](https://github.com/Ratan-07/blog-app.git)
   cd blog-app

2. Install dependencies:

Bash
npm install


3. Configure Environment Variables:
Create a .env file in the root directory:

Code snippet
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key


4. Start the application:

Bash
node server.js
Open http://localhost:5000 in your browser.

👨‍💻 Author
Developer: Ratan Thakur

GitHub: @Ratan-07