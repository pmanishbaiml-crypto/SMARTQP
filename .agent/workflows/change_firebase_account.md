---
description: How to change the Firebase account/project for the application
---

# Changing Firebase Account

To switch the application to a different Firebase project, you need to update both the backend service account and the frontend configuration.

## Prerequisites
1.  Access to the new Firebase Console.
2.  A new Firebase project created.

## Step 1: Backend Configuration

1.  **Generate New Service Account Key**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Select your new project.
    *   Go to **Project Settings** (gear icon) -> **Service accounts**.
    *   Click **Generate new private key**.
    *   Save the JSON file.

2.  **Update Backend File**:
    *   Move the downloaded JSON file to the backend directory: `d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend`.
    *   Open `d:\SmartQPGen1 (2)\SmartQPGen1\SmartQPGen\backend\app.py`.
    *   Locate the line defining `service_account_path` (around line 42).
    *   Update the filename to match your new JSON file.

    ```python
    # app.py
    service_account_path = 'YOUR_NEW_FILE_NAME.json'
    ```

## Step 2: Frontend Configuration

1.  **Get Web App Config**:
    *   In the Firebase Console, go to **Project Settings** -> **General**.
    *   Scroll down to **Your apps**.
    *   If you haven't created a web app yet, click the `</>` icon to create one.
    *   Copy the `firebaseConfig` object (it looks like the code below).

    ```javascript
    const firebaseConfig = {
      apiKey: "...",
      authDomain: "...",
      projectId: "...",
      storageBucket: "...",
      messagingSenderId: "...",
      appId: "..."
    };
    ```

2.  **Update HTML Files**:
    *   You need to update the `firebaseConfig` in the following files:
        *   `backend/templates/dashboard.html`
        *   `backend/templates/login.html`
        *   `backend/templates/register.html`
        *   `backend/templates/hod_login.html`
        *   `backend/templates/hod_register.html`
    *   Search for `const firebaseConfig = {` in each file and replace the values with your new configuration.

## Step 3: Firestore Rules (Optional but Recommended)

Ensure your new Firestore database has the correct security rules.
1.  Go to **Firestore Database** -> **Rules**.
2.  Paste the following rules (adjust as needed for your security model):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Step 4: Restart Server

1.  Stop the running Flask server (Ctrl+C).
2.  Start it again to load the new service account credentials.
