import { RequestModel, RequestResponseModel, XHRResponseModel } from '@/models'
import { SubscriberCallback, Unblocker, Unsubscriber } from '@/protocols'
import { GetFnParams, isFetchResponse } from './utils'

export class BrowserHttpRequestListener {
    private constructor() {}

    private static beforeSendCallbacks: Array<
        SubscriberCallback<RequestModel, Partial<RequestModel> | void>
    > = []

    private static onResponseArriveCallbacks: Array<
        SubscriberCallback<RequestResponseModel>
    > = []

    private static blockers: symbol[] = []

    private static originalFetch = window.fetch
    private static originalXHR = XMLHttpRequest.prototype.open

    private static safeRunBeforeSendCallbacks = (request: RequestModel) => {
        try {
            BrowserHttpRequestListener.beforeSendCallbacks.forEach((cb) => {
                const newRequestData = cb(request)

                if (newRequestData) {
                    Object.assign(request, newRequestData)
                }
            })
        } catch (error) {
            console.error('Error during beforeSend callbacks:', error)
        }
    }

    private static safeRunOnArrivesCallbacks = async (
        request: RequestModel,
        response: Response | XHRResponseModel
    ) => {
        try {
            const responseParsed = isFetchResponse(response)
                ? await response.json()
                : JSON.parse(response.response)

            BrowserHttpRequestListener.onResponseArriveCallbacks.forEach(
                (cb) => {
                    cb({
                        request,
                        response: isFetchResponse(response)
                            ? {
                                  rawResponse: response,
                                  statusCode: response.status,
                                  statusText: response.statusText,
                                  responseParsed,
                              }
                            : {
                                  rawResponse: response.response,
                                  statusCode: response.statusCode,
                                  statusText: response.statusText,
                                  responseParsed,
                              },
                    })
                }
            )
        } catch (error) {
            console.error('Error during onResponse callbacks:', error)
        }
    }

    private static getFetchRequestObject = (
        fetchParams: GetFnParams<typeof window.fetch>
    ): RequestModel => {
        const url =
            typeof fetchParams[0] === 'string' || fetchParams[0] instanceof URL
                ? String(fetchParams[0])
                : String(fetchParams[0]?.url)

        const request: RequestModel = {
            url,
            method: fetchParams[1]?.method || 'get',
            headers: fetchParams[1]?.headers || {},
            body: fetchParams[1]?.body,
        }

        return request
    }

    private static fetchDecorator: typeof window.fetch = async function (
        this: Window,
        ...fetchArgs
    ) {
        const request =
            BrowserHttpRequestListener.getFetchRequestObject(fetchArgs)

        BrowserHttpRequestListener.safeRunBeforeSendCallbacks(request)

        let originalResponse!: Response

        try {
            originalResponse =
                await BrowserHttpRequestListener.originalFetch.apply(window, [
                    request.url,
                    { ...(fetchArgs[1] || {}), ...request },
                ])
        } catch (error) {
            const typedError = error as Error
            const errorResponse = new Response(
                JSON.stringify({
                    message: typedError?.message,
                    stack: typedError?.stack,
                }),
                {
                    status: 0,
                    statusText: 'Error',
                }
            )

            await BrowserHttpRequestListener.safeRunOnArrivesCallbacks(
                request,
                errorResponse
            )
            throw error
        }

        await BrowserHttpRequestListener.safeRunOnArrivesCallbacks(
            request,
            originalResponse.clone()
        )

        return originalResponse
    }

    private static xhrDecorator: typeof XMLHttpRequest.prototype.open =
        function (
            this: typeof XMLHttpRequest.prototype,
            method: string,
            url: string | URL,
            async?: boolean,
            username?: string | null,
            password?: string | null
        ) {
            const request: RequestModel = {
                method,
                url: String(url),
                xhrInstance: this,
            }

            BrowserHttpRequestListener.safeRunBeforeSendCallbacks(request)

            this.addEventListener('load', function () {
                BrowserHttpRequestListener.safeRunOnArrivesCallbacks(request, {
                    response: this.response,
                    statusCode: this.status,
                    statusText: this.statusText,
                })
            })

            this.addEventListener('error', function () {
                BrowserHttpRequestListener.safeRunOnArrivesCallbacks(request, {
                    response: this.response,
                    statusCode: this.status,
                    statusText: this.statusText,
                })
            })

            return BrowserHttpRequestListener.originalXHR.apply(this, [
                method,
                url,
                Boolean(async),
                username,
                password,
            ])
        }

    /**
     * Temporarily blocks the listener from being stopped via `stop()`.
     *
     * This method adds a blocker that prevents `stop()` from restoring the default behavior
     * of `fetch` and `XMLHttpRequest`. This can be useful for ensuring that the listener
     * remains active during critical operations.
     *
     * @returns {Unblocker} A function to remove the blocker and allow the listener to be stopped.
     */
    static blockListeningState(): Unblocker {
        const blockSymbol = Symbol('Blocker')
        BrowserHttpRequestListener.blockers.push(blockSymbol)

        return () => {
            BrowserHttpRequestListener.blockers.splice(
                BrowserHttpRequestListener.blockers.indexOf(blockSymbol),
                1
            )
        }
    }

    /**
     * Starts intercepting HTTP requests made via `fetch` and `XMLHttpRequest`.
     * Overrides the default `fetch` and `XMLHttpRequest` behavior to allow for custom
     * callbacks before requests are sent and after responses are received.
     *
     *
     * Call this method to begin listening to HTTP requests.
     */
    static start(): void {
        window.fetch = BrowserHttpRequestListener.fetchDecorator
        XMLHttpRequest.prototype.open = BrowserHttpRequestListener.xhrDecorator
    }

    /**
     * Stops intercepting HTTP requests and restores the original behavior of `fetch` and `XMLHttpRequest`.
     *
     * If blocking is active (i.e., there are blockers registered via `blockListeningState()`), this method
     * will not restore the original behavior until the blockers are removed.
     *
     * Call this method to stop the interception of HTTP requests and return to the default browser behavior.
     */
    static stop(): boolean {
        const isBlocked = BrowserHttpRequestListener.blockers.length
        if (isBlocked) return false

        window.fetch = BrowserHttpRequestListener.originalFetch
        XMLHttpRequest.prototype.open = BrowserHttpRequestListener.originalXHR

        return true
    }

    /**
     * Registers a callback that is triggered before an HTTP request is sent.
     *
     * The callback receives the request model, allowing modifications to the request
     * such as changing headers, URL, or method before the request is sent.
     *
     * @param {SubscriberCallback<RequestModel, Partial<RequestModel> | void>} callback -
     *        Function to be called before the request is sent. Can return modifications to the request.
     * @returns {Unsubscriber} A function to unsubscribe the callback.
     */
    static beforeSendHttpRequest(
        callback: SubscriberCallback<RequestModel, Partial<RequestModel> | void>
    ): Unsubscriber {
        BrowserHttpRequestListener.beforeSendCallbacks.push(callback)

        return () => {
            const index =
                BrowserHttpRequestListener.beforeSendCallbacks.indexOf(callback)

            if (index === -1) return
            BrowserHttpRequestListener.beforeSendCallbacks.splice(index, 1)
        }
    }

    /**
     * Registers a callback that is triggered when an HTTP response is received.
     *
     * The callback receives the request and response models, providing you with a response copy.
     *
     * @param {SubscriberCallback<RequestResponseModel>} callback -
     *        Function to be called when the response arrives. Receives the request and response data.
     * @returns {Unsubscriber} A function to unsubscribe the callback.
     */
    static onHttpResponseArrives(
        callback: SubscriberCallback<RequestResponseModel>
    ): Unsubscriber {
        BrowserHttpRequestListener.onResponseArriveCallbacks.push(callback)

        return () => {
            const index =
                BrowserHttpRequestListener.onResponseArriveCallbacks.indexOf(
                    callback
                )

            if (index === -1) return
            BrowserHttpRequestListener.onResponseArriveCallbacks.splice(
                index,
                1
            )
        }
    }

    /**
     * Clears all registered before-send and response-arrival callbacks.
     *
     * This method will remove all subscribers for both before-send and response-arrival events.
     */
    static clearSubscribers() {
        BrowserHttpRequestListener.beforeSendCallbacks.length = 0
        BrowserHttpRequestListener.onResponseArriveCallbacks.length = 0
    }
}
