# SecureKey 🔐

A secure, cloud-based password management solution with team collaboration capabilities, password strength analysis, and multi-factor authentication.

## Features

- **Password Storage**: Securely save and manage passwords in the cloud
- **Password Strength Analysis**: Real-time password strength evaluation with intelligent recommendations
- **Team Collaboration**: Share passwords across your team securely
- **Multi-Factor Authentication (MFA)**: Enhanced security layer to protect your account
- **Cloud Sync**: Access your passwords from anywhere with cloud storage
- **Smart Recommendations**: Get suggestions for stronger passwords based on security best practices

## Tech Stack

### Server
- **Node.js & Express**: Backend API framework
- **MongoDB & Mongoose**: Database and ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Security**: Cookie-parser, CORS, express-validator
- **Password Analysis**: zxcvbn library for strength evaluation
- **Email**: Nodemailer for notifications
- **File Management**: Cloudinary integration, express-fileupload

### Client
- **React 19**: Modern UI library
- **Vite**: Fast build tool and dev server
- **React Router DOM**: Client-side routing
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **React Hot Toast**: Toast notifications

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB database
- npm or yarn package manager

### Server Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory with the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

4. Start the development server:
```bash
npm run dev
```

### Client Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. **Sign Up**: Create a new account with email verification
2. **Enable MFA**: Set up multi-factor authentication for added security
3. **Add Passwords**: Store your passwords with automatic strength analysis
4. **Review Recommendations**: Get suggestions for weak passwords
5. **Share with Team**: Invite team members and share passwords securely
6. **Access Anywhere**: Log in from any device to access your passwords

## Security Features

- **Encrypted Storage**: All passwords are encrypted before storage
- **Bcrypt Hashing**: Secure password hashing algorithm
- **JWT Authentication**: Token-based authentication system
- **MFA Protection**: Two-factor authentication support
- **Password Strength Scoring**: Real-time analysis using zxcvbn
- **Secure Cookie Handling**: HTTP-only cookies for session management

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-mfa` - MFA verification
- `GET /api/passwords` - Get all passwords
- `POST /api/passwords` - Create new password entry
- `PUT /api/passwords/:id` - Update password
- `DELETE /api/passwords/:id` - Delete password
- `POST /api/team/invite` - Invite team member
- `GET /api/team/shared` - Get shared passwords

## Development

### Run Server in Development
```bash
cd server
npm run dev
```

### Run Client in Development
```bash
cd client
npm run dev
```

### Build for Production
```bash
cd client
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Built with ❤️ for secure password management**
