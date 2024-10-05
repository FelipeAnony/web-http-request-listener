import { RequestModel, RequestResponseModel } from '@/models'
import { SubscriberCallback, Unsubscriber } from '@/protocols'

export class BrowserHttpRequestListener {
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
        const method = args[1]?.method || 'get'
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
            BrowserHttpRequestListener.beforeSendCallbacks.forEach((cb) => {
                const newRequestData = cb({
                    method,
                    url,
                    body,
                    headers,
                })

                if (newRequestData) {
                    Object.assign(request, newRequestData)
                }
            })
        } catch (error) {
            console.error('Error during beforeSend callbacks:', error)
        }

        const response = await BrowserHttpRequestListener.originalFetch.apply(
            window,
            [request.url, { ...(args[1] || {}), ...request }]
        )

        try {
            const clonedResponse = response.clone()
            const responseParsed = await clonedResponse.json()

            BrowserHttpRequestListener.onResponseArriveCallbacks.forEach(
                (cb) => {
                    cb({
                        request,
                        response: {
                            rawResponse: clonedResponse,
                            responseParsed,
                            statusCode: clonedResponse.status,
                            statusText: clonedResponse.statusText,
                        },
                    })
                }
            )
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
                BrowserHttpRequestListener.beforeSendCallbacks.forEach((cb) => {
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
                    BrowserHttpRequestListener.onResponseArriveCallbacks.forEach(
                        (cb) => {
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
                        }
                    )
                } catch (error) {
                    console.error('Error during onResponse callbacks:', error)
                }
            })

            this.addEventListener('error', function () {
                try {
                    BrowserHttpRequestListener.onResponseArriveCallbacks.forEach(
                        (cb) => {
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
                        }
                    )
                } catch (error) {
                    console.error('Error during onResponse callbacks:', error)
                }
            })

            return BrowserHttpRequestListener.originalXHR.apply(this, [
                method,
                url,
                Boolean(async),
                username,
                password,
            ])
        }

    static start(): void {
        window.fetch = BrowserHttpRequestListener.fetchDecorator
        XMLHttpRequest.prototype.open = BrowserHttpRequestListener.xhrDecorator
    }

    static stop(): void {
        window.fetch = BrowserHttpRequestListener.originalFetch
        XMLHttpRequest.prototype.open = BrowserHttpRequestListener.originalXHR
    }

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

    static clearSubscribers() {
        BrowserHttpRequestListener.beforeSendCallbacks.length = 0
        BrowserHttpRequestListener.onResponseArriveCallbacks.length = 0
    }
}
