# File Manager Web Application

A web-based file manager application built with Node.js and React that allows authenticated users to access, view, edit, and download files over the network.

## Features

- User authentication with role-based access control (admin, editor, viewer)
- File and folder browsing with search and sorting
- File upload, download, rename, and delete operations
- Modern Material-UI interface
- Responsive design for all devices

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: React with Material-UI
- **Authentication**: JWT (JSON Web Tokens)
- **File Operations**: Node.js native fs module

## Project Structure

The project is organized into two main directories:

- `backend/` - Express server with REST API endpoints
- `frontend/` - React application with Material UI

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository

2. Install backend dependencies
   ```
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```
   cd frontend
   npm install
   ```

### Running the Application

1. Start the backend server (from the `backend` directory)
   ```
   npm start
   ```
   The server will run on port 5000 by default.

2. Start the frontend development server (from the `frontend` directory)
   ```
   npm start
   ```
   The React application will run on port 3000 by default.

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Default Login Credentials

- **Email**: admin@example.com
- **Password**: adminPassword123

## User Roles

- **Admin**: Can manage users, upload/download/edit/delete files
- **Editor**: Can upload/download/edit/delete files
- **Viewer**: Can only view and download files

## Configuration

Backend environment variables (.env file):

- `PORT`: Server port (default: 5000)
- `JWT_SECRET`: Secret key for JWT token signing
- `UPLOADS_DIR`: Directory for file uploads (default: './uploads')
- `ADMIN_EMAIL`: Default admin email
- `ADMIN_PASSWORD`: Default admin password

## OneDrive Integration (Future Enhancement)

The application is designed to allow future integration with Microsoft OneDrive for opening and exporting CSV/Excel files.

## License

This project is licensed under the MIT License.