# Share Links

An application for sharing links. Simple and sweet, don't worry about comments.

## Features

- Share links with people
- Create channels for topics or groups. Like a hashtag or group message but less lame
- No need for comments or replies. Just an emoji if you want, emojis are better than words sometimes anyway
- Automatic link preview fetching, including enhanced support for YouTube links

## Tech Stack

- React, cause I'm learning it and it's pretty good
- Firebase, you get so much for so little
- TypeScript, errors caught early and often
- Create React App to get it started
- pnpm cause I heard it was better than npm or yarn

## Getting Started

1. Clone the repository:

   ```
   git clone https://github.com/goggledefogger/react-share-links
   ```

2. Install dependencies:

   ```
   cd react-share-links
   pnpm install
   cd functions
   pnpm install
   cd ..
   ```

3. Configure Firebase:

   - Create a Firebase project at https://console.firebase.google.com/
   - Add a web app to your project
   - Copy the config object
   - In the root directory, copy the `.env.sample` file to create `.env`:
     ```
     cp .env.sample .env
     ```
   - Open `.env` and replace the sample values with your actual Firebase config:
     ```
     REACT_APP_FIREBASE_API_KEY=your_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     ```

4. Configure Firebase Functions:

   - Navigate to the `functions` directory
   - Copy the `sample.runtimeconfig.json` file to create `.runtimeconfig.json`:
     ```
     cp sample.runtimeconfig.json .runtimeconfig.json
     ```
   - Open `.runtimeconfig.json` and replace the sample values with your actual credentials:
     ```json
     {
       "mailjet": {
         "api_key": "your_mailjet_api_key",
         "api_secret": "your_mailjet_api_secret",
         "sender_email": "your_sender_email@example.com"
       },
       "youtube": {
         "api_key": "your_youtube_data_api_key"
       }
     }
     ```

5. Import Firebase Functions configuration:

   You can use the `.runtimeconfig.json` file to set the Firebase Functions configuration directly:

   ```
   firebase functions:config:set $(cat .runtimeconfig.json)
   ```

   This command will set the new configuration based on your `.runtimeconfig.json` file. These configuration values will be securely stored in Firebase and will be available to your deployed functions.

6. Start the application and watch the magic happen:
   ```
   pnpm start
   ```

## Testing

To test the frontend, run in the root directory:
```
pnpm test
```

To test the Firebase Functions, run in the root directory:
```
pnpm test:functions
```

## Deployment

1. Build the React app:
   ```
   pnpm run build
   ```

2. Deploy to Firebase:
   ```
   firebase deploy
   ```

   This will deploy both the frontend and the Firebase Functions. The configuration values you imported from `.runtimeconfig.json` will be used by the deployed functions.

## Firebase Functions

This project uses Firebase Functions for server-side operations such as:

- Sending email digests
- Fetching and saving link previews, including enhanced previews for YouTube links

The `fetchAndSaveLinkPreview` Firebase Function automatically fetches preview data for shared links. For YouTube links, it uses the YouTube Data API to fetch additional information.

To work with Firebase Functions locally:

1. Install the Firebase CLI globally:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. To run Functions locally for testing:
   ```
   firebase emulators:start --only functions
   ```

## Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-amazing-feature`
3. Make your changes
4. Commit your changes: `git commit -m 'Add some AmazingFeature'`
5. Push to the branch: `git push origin feature/your-amazing-feature`
6. Submit a pull request

This project was bootstrapped with Create React App.

## License

Distributed under the MIT License. See `LICENSE` for more information. (basically "use it however you want, but don't blame us if something goes wrong")

## Contact

Danny Bauman - dannybauman@gmail.com

Project Link: [https://github.com/goggledefogger/react-share-links](https://github.com/goggledefogger/react-share-links)

## Acknowledgements

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Create React App](https://create-react-app.dev/)
- [Mailjet](https://www.mailjet.com/) for email services
- [YouTube Data API](https://developers.google.com/youtube/v3) for enhanced YouTube link previews
