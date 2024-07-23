# Share Links

An application for sharing links. Simple and sweet, don't worry about comments.

## Features

- Share links with people
- Create channels for topics or groups. Like a hashtag, but less lame
- No need for comments or replies. Just an emoji if you want, emojis > words sometimes anyway

## Tech Stack

- React cause I'm learning it, and it's pretty good
- Firebase, you get so much for so little
- TypeScript, errors caught early and often
- Create React App, get it started
- pnpm cause I heard it was better

## Getting Started

1. Clone the repository:

   ```
   git clone https://github.com/goggledefogger/share-links.git
   ```

2. Install dependencies:

   ```
   cd share-links
   pnpm install
   ```

3. Configure Firebase:

   - Create a Firebase project at https://console.firebase.google.com/
   - Add a web app to your project
   - Copy the config object
   - Create a `.env` file in the root directory
   - Add your Firebase config
     ```
     REACT_APP_FIREBASE_API_KEY=your_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     ```

4. Start the application and watch the magic happen:
   ```
   pnpm start
   ```

## Testing

```
pnpm test
```

## Deployment

```
pnpm run build
firebase deploy
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

Project Link: [https://github.com/goggledefogger/share-links](https://github.com/goggledefogger/share-links)

## Acknowledgements

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Create React App](https://create-react-app.dev/)
