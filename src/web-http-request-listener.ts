import { RequestModel, RequestResponseModel } from './models'
import { SubscriberCallback, Unsubscriber } from './protocols'

export class WebHttpRequestListener {
    private constructor() {}

    private static originalFetch = window.fetch
    private static originalXHR = XMLHttpRequest.prototype.open

    private static beforeSendCallbacks: Array<
        SubscriberCallback<RequestModel, Partial<RequestModel> | void>
    > = []

    private static onResponseArriveCallbacks: Array<
        SubscriberCallback<RequestResponseModel>
    > = []

    private static fetchDecorator: typeof window.fetch = async function (
        ...args
    ) {
        const method = args[1]?.method || 'GET'
        const headers = args[1]?.headers || {}
        const body = args[1]?.body
        const url =
            typeof args[0] === 'string' || args[0] instanceof URL
                ? String(args[0])
                : String(args[0]?.url)

        const request: RequestModel = {
            url,
            method,
            headers,
            body,
        }

        try {
            WebHttpRequestListener.beforeSendCallbacks.slice().forEach((cb) => {
                const newRequestData = cb({
                    method,
                    url,
                    body,
                })

                if (newRequestData) {
                    Object.assign(request, newRequestData)
                }
            })
        } catch (error) {
            console.error('Error during beforeSend callbacks:', error)
        }

        const response = await WebHttpRequestListener.originalFetch.apply(
            window,
            [request.url, { ...(args[1] || {}), ...request }]
        )

        try {
            const clonedResponse = response.clone()
            const responseParsed = await clonedResponse.json()

            setTimeout(() => {
                WebHttpRequestListener.onResponseArriveCallbacks
                    .slice()
                    .forEach((cb) => {
                        cb({
                            request,
                            response: {
                                rawResponse: clonedResponse,
                                responseParsed,
                                statusCode: clonedResponse.status,
                                statusText: clonedResponse.statusText,
                            },
                        })
                    })
            })
        } catch (error) {
            console.error('Error during onResponse callbacks:', error)
        }

        return response
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
            }

            try {
                WebHttpRequestListener.beforeSendCallbacks
                    .slice()
                    .forEach((cb) => {
                        const newRequestData = cb({
                            method,
                            url: String(url),
                            xhrInstance: this,
                        })

                        if (newRequestData) {
                            Object.assign(request, {
                                url: newRequestData.url || url,
                                method: newRequestData.method || method,
                            })
                        }
                    })
            } catch (error) {
                console.error('Error during beforeSend callbacks:', error)
            }

            this.addEventListener('load', function () {
                try {
                    WebHttpRequestListener.onResponseArriveCallbacks
                        .slice()
                        .forEach((cb) => {
                            cb({
                                request,
                                response: {
                                    rawResponse: this.response,
                                    responseParsed: JSON.parse(
                                        this.response || ''
                                    ),
                                    statusCode: this.status,
                                    statusText: this.statusText,
                                },
                            })
                        })
                } catch (error) {
                    console.error('Error during onResponse callbacks:', error)
                }
            })

            this.addEventListener('error', function () {
                try {
                    WebHttpRequestListener.onResponseArriveCallbacks
                        .slice()
                        .forEach((cb) => {
                            cb({
                                request,
                                response: {
                                    rawResponse: this.response,
                                    statusCode: this.status,
                                    responseParsed: JSON.parse(
                                        this.response || ''
                                    ),
                                    statusText: this.statusText,
                                },
                            })
                        })
                } catch (error) {
                    console.error('Error during onResponse callbacks:', error)
                }
            })

            return WebHttpRequestListener.originalXHR.apply(this, [
                method,
                url,
                Boolean(async),
                username,
                password,
            ])
        }

    static start(): void {
        window.fetch = WebHttpRequestListener.fetchDecorator
        XMLHttpRequest.prototype.open = WebHttpRequestListener.xhrDecorator
    }

    static stop(): void {
        window.fetch = WebHttpRequestListener.originalFetch
        XMLHttpRequest.prototype.open = WebHttpRequestListener.originalXHR
    }

    static beforeSendHttpRequest(
        callback: SubscriberCallback<RequestModel, Partial<RequestModel> | void>
    ): Unsubscriber {
        WebHttpRequestListener.beforeSendCallbacks.push(callback)

        return () => {
            const index =
                WebHttpRequestListener.beforeSendCallbacks.indexOf(callback)

            if (index === -1) return
            WebHttpRequestListener.beforeSendCallbacks.splice(index, 1)
        }
    }

    static onHttpResponseArrives(
        callback: SubscriberCallback<RequestResponseModel>
    ): Unsubscriber {
        WebHttpRequestListener.onResponseArriveCallbacks.push(callback)

        return () => {
            const index =
                WebHttpRequestListener.onResponseArriveCallbacks.indexOf(
                    callback
                )

            if (index === -1) return

            WebHttpRequestListener.onResponseArriveCallbacks.splice(index, 1)
        }
    }
}
