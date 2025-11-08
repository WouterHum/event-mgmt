# Event Management System

Full-stack app built with:

- Frontend: React + Next.js + TypeScript + MUI + Tailwind
- Backend: Python + FastAPI
- Database: MySQL
- Hosting: AWS (Lightsail + Amplify)

## Local Development

Backend build
needs to be in api folder
sam deploy --stack-name event-mgmt-api --s3-bucket fastapi-deployment-861276123022 --capabilities CAPABILITY_IAM

Front end build

git add .
git commit -m "Updated events page and Dockerfile"
git push
