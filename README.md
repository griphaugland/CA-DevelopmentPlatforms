# API Documentation

## Introduction

This API provides a platform for managing user accounts, including registration, login, user profile updates, and deleting accounts. Additionally, it supports managing addiction items, allowing users to add and retrieve information about their addictions.

## Setup Instructions

1. **Install Dependencies**

   Before running the server, ensure you have Node.js installed. Then, install the required dependencies by running:

2. **Environment Variables**

Create a `.env` file in the root directory of your project and add the following environment variables:

PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
TOKEN_HASH_KEY=your_secret_key_for_jwt
HASH_KEY=your_secret_key_for_password_hashing

Adjust the values according to your database configuration and security preferences.

3. **Start the Server**

Run the following command to start the server:

npm start

The server will listen on the port specified in the `.env` file or 3000 by default.

## API Endpoints

### User Management

- **Register (`POST /register`)**

Allows a new user to register. The request body must include `username`, `email`, `password`, `first_name`, `last_name`, `bio`, `gender`, `profile_picture_url`, and `role`.

- **Response:** Returns a message with the registered user's details.

- **Login (`POST /login`)**

Authenticates a user. The request body needs `email` and `password`.

- **Response:** On success, returns an access token.

- **Update User (`PATCH /users`)**

Updates user details. Requires an authorization header with a bearer token and the updated user details in the request body.

- **Response:** Returns a message indicating the update status, including previous and updated data.

- **Delete User (`DELETE /users`)**

Deletes a user account. Requires an authorization header with a bearer token.

- **Response:** Returns a message indicating the account deletion.

### Addiction Management

- **Add Addiction Item (`POST /addiction`)**

Adds a new addiction item for the authenticated user. Requires an authorization header with a bearer token and the addiction item details in the request body.

- **Response:** Returns a message with the created addiction item's details.

- **Get Addiction Items (`GET /addictions`)**

Retrieves all addiction items for the authenticated user. Requires an authorization header with a bearer token.

- **Response:** Returns a list of addiction items.

## Security Notes

Ensure that you handle SSL certificate validation in production more securely than the provided example. Also, store your environment variables securely and avoid hard-coding sensitive information in your application code.
