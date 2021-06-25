# Visual Decision-Support for Live Digital Forensic Investigation - Client

This web application is part of a research prototype to provide visual decision-support for Live Digital Forensic investigations. A publication is currently being prepared and will be linked here once it is available.

## Summary

The prototype (together with the respective [server component](https://github.com/bof64665/LDF_GraphQLServer)) is intended for forensic experts that need to quickly decide which specialized forensic tools they should apply during a live forensic investigation. The web application includes several visualizations to facilitate this decision-making process.

## Setup
The web application requires a running instance of its [server component](https://github.com/bof64665/LDF_GraphQLServer) on [http://localhost:4000](http://localhost:4000). Further setup is fairly straightforward and complies with standard deployment of a React App boostrapped with [Create React App](https://github.com/facebook/create-react-app). Details to available scripts are below.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3001](http://localhost:3001) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.
