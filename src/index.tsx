import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloProvider } from '@apollo/client/react';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import LuxonUtils from '@date-io/luxon';
import './index.css';
import App from './App/App';
import reportWebVitals from './reportWebVitals';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { Helmet } from 'react-helmet';
import { Provider } from "react-redux";
import { filterStore } from "./redux/store";

const client = new ApolloClient({
    uri: 'http://localhost:4000',
    cache: new InMemoryCache()
});

ReactDOM.render(
  <React.StrictMode>
      <ApolloProvider client={client}>
          <MuiPickersUtilsProvider utils={LuxonUtils}>
            <Helmet>
                <script src="https://unpkg.com/force-in-a-box@1.0.1/dist/forceInABox.js" type="text/javascript" />
            </Helmet>
            <Provider store={filterStore}>
                <App />
            </Provider>
                
          </MuiPickersUtilsProvider>
      </ApolloProvider>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
