# CollabHub 🚀

**Connect. Collaborate. Create.**

CollabHub is a collaboration platform connecting students, founders, talent, and investors with opportunities like hackathons, internships, and projects.

> 🏆 **Hackathon Submission** - Built for rapid deployment with SQLite, no external dependencies required!

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## ✨ Features

### For Talent
- Browse hackathons, internships, and projects
- Apply with cover letter and portfolio
- Track application status
- Direct messaging with founders

### For Founders
- Create and manage startup profiles
- Post opportunities and roles
- Review applications (accept/reject)
- Build your team

### For Investors
- Discover promising startups
- View pitch decks
- Connect with founders

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Django 5.0 + Django REST Framework |
| Auth | JWT (SimpleJWT) with refresh tokens |
| Database | SQLite (development) / PostgreSQL (production) |
| Frontend | HTML5 + Tailwind CSS + Vanilla JS |
| API | RESTful with pagination, filtering, search |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Backend Setup

```bash
# 1. Clone & navigate
cd CollabHub/backend

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux

# 5. Run migrations
python manage.py migrate

# 6. Create superuser (admin)
python manage.py createsuperuser

# 7. Run server
python manage.py runserver
```

Backend runs at: `http://localhost:8000`

### Frontend Setup

Simply open `frontend/index.html` in a browser, or serve with:

```bash
cd frontend
python -m http.server 3000
```

Frontend runs at: `http://localhost:3000`

---

## 📚 API Documentation

Base URL: `http://localhost:8000/api`

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register/` | POST | Create new user |
| `/auth/login/` | POST | Get JWT tokens |
| `/auth/refresh/` | POST | Refresh access token |
| `/auth/logout/` | POST | Blacklist refresh token |

**Register Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "talent"
}
```

**Login Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1Q...",
  "refresh": "eyJ0eXAiOiJKV1Q...",
  "user": { "id": 1, "email": "john@example.com", ... }
}
```

### Users

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users/` | GET | ✅ | List users |
| `/users/me/` | GET | ✅ | Current user profile |
| `/users/me/` | PATCH | ✅ | Update profile |
| `/users/<id>/` | GET | ✅ | User details |

### Startups

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/startups/` | GET | ✅ | List startups |
| `/startups/` | POST | ✅ | Create startup |
| `/startups/<id>/` | GET | ✅ | Startup details |
| `/startups/<id>/` | PATCH | ✅ | Update (founder only) |
| `/startups/<id>/` | DELETE | ✅ | Delete (founder only) |
| `/startups/my/` | GET | ✅ | My startups |

### Opportunities

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/opportunities/` | GET | ✅ | List opportunities |
| `/opportunities/` | POST | ✅ | Create opportunity |
| `/opportunities/<id>/` | GET | ✅ | Opportunity details |
| `/opportunities/<id>/` | PATCH | ✅ | Update (owner only) |
| `/opportunities/search/` | GET | ✅ | Advanced search |
| `/opportunities/my/` | GET | ✅ | My opportunities |

**Query Parameters:**
- `?type=hackathon` - Filter by type (hackathon, internship, project, job)
- `?search=python` - Search in title/description
- `?skills=Python&skills=React` - Filter by skills
- `?ordering=-created_at` - Sort results

### Applications

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/collaborations/applications/` | GET | ✅ | My applications |
| `/collaborations/applications/` | POST | ✅ | Apply to opportunity |
| `/collaborations/applications/<id>/` | PATCH | ✅ | Update status |
| `/collaborations/opportunities/<id>/applications/` | GET | ✅ | View applicants (owner) |

### Messaging

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/messages/` | GET | ✅ | List conversations |
| `/messages/start/` | POST | ✅ | Start conversation |
| `/messages/<id>/messages/` | GET | ✅ | Get messages |
| `/messages/<id>/messages/` | POST | ✅ | Send message |

---

## 📁 Project Structure

```
CollabHub/
├── backend/
│   ├── collabhub/          # Django settings
│   ├── users/              # User auth & profiles
│   ├── startups/           # Startup management
│   ├── opportunities/      # Hackathons, jobs, etc.
│   ├── collaborations/     # Applications & connections
│   ├── messaging/          # Direct messaging
│   ├── tests.py            # Test cases
│   └── manage.py
│
├── frontend/
│   ├── index.html          # Landing page
│   ├── css/styles.css      # Custom styles
│   ├── js/
│   │   ├── api.js          # API integration + JWT
│   │   └── app.js          # Utilities
│   └── pages/
│       ├── login.html
│       ├── register.html
│       ├── opportunities.html
│       ├── dashboard-talent.html
│       ├── dashboard-founder.html
│       ├── dashboard-investor.html
│       └── profile.html
│
└── README.md
```

---

## 🧪 Testing

```bash
cd backend

# Run all tests
python manage.py test

# Run specific test class
python manage.py test tests.UserAuthenticationTests

# Run with coverage
pip install coverage
coverage run manage.py test
coverage report
```

---

## 🚢 Deployment

### Quick Deploy Checklist

1. **Environment Variables**
   ```bash
   SECRET_KEY=<generate-new-secure-key>
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com
   ```

2. **Collect Static Files**
   ```bash
   python manage.py collectstatic
   ```

3. **Database Migration**
   ```bash
   python manage.py migrate
   ```

### Security Features ✅

- [x] JWT Authentication with token blacklisting
- [x] Password validation (min length, common passwords)
- [x] Rate limiting (100/hour anon, 1000/hour authenticated)
- [x] CORS configuration
- [x] CSRF protection
- [x] Owner-only permissions for edits/deletes

---

## 🏆 Hackathon Notes

**Why CollabHub?**
- **Zero external dependencies** - Uses SQLite, works out-of-the-box
- **Full-stack solution** - Backend API + Frontend UI
- **Production-ready** - Auth, permissions, validation, tests
- **Scalable architecture** - Modular Django apps

**Quick Demo Steps:**
1. Run `python manage.py migrate`
2. Run `python manage.py runserver`
3. Open `frontend/index.html`
4. Register as Talent, Founder, or Investor
5. Explore the platform!

---

## 📄 License

MIT License - feel free to use for your projects!

---

Built with ❤️ for innovators and collaborators.
