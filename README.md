Attendify

Attendify is a photo-based classroom attendance management system designed to help lecturers record, manage, and analyse student attendance more efficiently.
The system allows lecturers to upload classroom photos, identify students through an external identity recognition API, review attendance results, manage classes and students, and generate attendance reports.
Note: The identity recognition service is provided through an external API developed by a separate team. My primary contributions focused on the application interface, API integration, attendance management, session management, and reporting functionality.


✨ Features
> 📸 Upload classroom photos for attendance
> 👤 Detect faces from uploaded classroom images
> 🔗 Integrate with an external identity recognition API
> ✅ Automatically determine present and absent students
> ❓ Identify and track unrecognized students
> 📝 Review and manually edit attendance records
> 📚 Create and manage classes
> 👨‍🎓 Manage student records
> 📅 Manage lecturer schedules
> 🕒 View attendance session history
> 📊 View attendance statistics and analytics
> 📄 Generate attendance reports


🛠️ Technologies
Frontend
- React Native
- Expo
- TypeScript / TSX
Backend
- Node.js
- face-api.js
- TinyFaceDetector
- Firebase
APIs & Services
- REST API
- External Identity Recognition API
Development Tools
- Git
- GitHub
- Visual Studio Code


🚀 Getting Started
Prerequisites
1. Make sure you have the following installed:
- Node.js
- npm
- Expo CLI / Expo development environment
- Git
2. Clone the Repository
- git clone https://github.com/YOUR_USERNAME/Attendify.git
- cd Attendify
3. Install Dependencies

If the mobile application is located inside mobile_app/attendance_app:
- cd mobile_app/attendance_app
- npm install

For the backend:
- cd ../../../backend
- npm install

Environment Variables
If the project requires environment variables, create a .env file based on the provided example:
- cp .env.example .env

Then configure the required API endpoints and credentials.
> Never commit API keys, passwords, tokens, or other sensitive credentials to the repository.

Run the Application
Start the Expo development server:
- cd mobile_app/attendance_app
- npx expo start
Start the backend separately:
- cd backend
- npm start

The exact commands may vary depending on the project's current configuration.


🎯 Project Goals
Attendify was developed to explore how software applications can be used to simplify classroom attendance management.
The project focuses on:
- Reducing manual attendance processes
- Improving attendance record management
- Providing lecturers with useful attendance information
- Integrating external services through APIs
- Applying software engineering principles to a real-world problem
