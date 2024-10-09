# Browser-http-request-listener

_BrowserHttpRequestListener_ is a lightweight (with zero production dependencies) JavaScript library designed for intercepting and manipulating HTTP requests made in the browser, specifically when service workers cannot be used or when you need to intercept responses from third-party libraries over which you lack control. This library enables you to register callbacks to modify requests before they are sent _(for fetch only)_ and to register callbacks to run with a copy of the response _(for both, fetch and XHR)_, providing a flexible and powerful way to monitor and control HTTP interactions.

## Installation

Install the package using npm:

```bash
npm install Browser-http-request-listener
```

## Features

-   Before-Send Callbacks (for fetch only): Register callbacks that execute before a request is sent using fetch, allowing you to modify headers, change the request URL, method or body.

-   Response Callbacks: Execute custom logic when responses are received for both fetch and XMLHttpRequest, allowing you to inspect, log, or do whatever you need with the response.

-   Easy Start and Stop: Seamlessly toggle between active monitoring and normal browser behavior.

-   Flexible Blocking and Unblocking: Temporarily block or unblock the listener client, which can prevent start/stop operations as needed.

-   Built-in types included, with full support for JS and TS users.

## Usage

**Start Listening**

To start intercepting requests and responses, call the _start_ method:

```javaScript
import { BrowserHttpRequestListener } from 'browser-http-request-listener';

BrowserHttpRequestListener.start();
```

**Registering Before-Send Callbacks (fetch only)**

You can add callbacks that are executed before a fetch request is sent. This allows you to modify the request details, such as headers or the URL:

```javaScript
const unsubscribeBeforeSend = BrowserHttpRequestListener.beforeSendHttpRequest((request) => {
    console.log('Fetch request about to be sent:', request);
    request.headers['Authorization'] = 'Bearer your-token'; // Modify headers
});

// To unsubscribe this callback later
unsubscribeBeforeSend();
```

**Registering Response Callbacks**

Add callbacks to process responses as soon as they arrive for both fetch and XMLHttpRequest:

```javaScript
const unsubscribeOnResponse = BrowserHttpRequestListener.onHttpResponseArrives((responseDetails) => {
    console.log('Response received:', responseDetails);
});

// To unsubscribe this callback later
unsubscribeOnResponse();
```

**Stopping the Listener**

To stop intercepting requests and restore the original behavior, call the stop method:

```javaScript
BrowserHttpRequestListener.stop();
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is open source and available under the [MIT License](LICENSE).
