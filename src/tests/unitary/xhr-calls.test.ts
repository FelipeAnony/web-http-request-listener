import { BrowserHttpRequestListener } from '@/browser-http-request-listener'
import { RequestModel, RequestResponseModel, ResponseModel } from '@/models'
import jsonDb from '@/tests/json-server/db.json'
import { waitFor } from '../utils'

const jsonServerPostsApiEndpoint = 'http://localhost:3000/posts'
const jsonServerStringResponseApiEndpoint = 'http://localhost:3000/string'
const jsonServerNullResponseApiEndpoint = 'http://localhost:3000/null'
const jsonServerNumberResponseApiEndpoint = 'http://localhost:3000/number'

const doPromiseBasedXHRCall = (
    method: string,
    url: string | URL,
    body?: Document | XMLHttpRequestBodyInit | null
) => {
    return new Promise((res, rej) => {
        const xhr = new XMLHttpRequest()

        xhr.addEventListener('load', () => {
            res(xhr.response)
        })

        xhr.addEventListener('error', () => {
            rej(xhr.response)
        })

        xhr.open(method, url)
        xhr.send(body)
    })
}

describe('BrowserHttpRequestListener tests for XMLHttpRequests', () => {
    beforeEach(() => {
        BrowserHttpRequestListener.stop()
        BrowserHttpRequestListener.clearSubscribers()
    })

    it('Should not listen for calls untill start method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).not.toHaveBeenCalled()

        BrowserHttpRequestListener.start()
        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('Should stop listen for calls appropiately when the stop method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)
        BrowserHttpRequestListener.start()

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(true)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        expect(callback).not.toHaveBeenCalled()
    })

    it('Should blocks the listening state appropiately and prevent stops if there is any blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const unblock = BrowserHttpRequestListener.blockListeningState()
        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(false)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).toHaveBeenCalled()

        // cleanup
        unblock()
    })

    it('Should unblocks the listening state appropiately when the unblocker is called', async () => {
        const callback = jest.fn()
        const unblock = BrowserHttpRequestListener.blockListeningState()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        const stoped = BrowserHttpRequestListener.stop()
        expect(stoped).toBe(false)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()

        unblock()
        const stoped2 = BrowserHttpRequestListener.stop()
        expect(stoped2).toBe(true)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should blocks the listening state appropiately and prevent clear all subscribers if there is any blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const unblock = BrowserHttpRequestListener.blockListeningState()
        const cleaned = BrowserHttpRequestListener.clearSubscribers()
        expect(cleaned).toBe(false)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).toHaveBeenCalled()

        // cleanup
        unblock()
    })

    it('Should clean all the subscribers at once when clearSubscribers is called and there is no blocker', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        const cleaned = BrowserHttpRequestListener.clearSubscribers()
        expect(cleaned).toBe(true)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should unsubscribe the beforeSend callbacks appropiately', async () => {
        const callback = jest.fn()
        const callback2 = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)

        const unsubscribe =
            BrowserHttpRequestListener.beforeSendHttpRequest(callback2)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(1)
        expect(callback2).toHaveBeenCalledTimes(1)

        unsubscribe()

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('Should calls all the subscribed callbacks before the actual XHR.send calls', async () => {
        const callbacks = [
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
        ]

        BrowserHttpRequestListener.start()
        callbacks.forEach((cb) => {
            BrowserHttpRequestListener.beforeSendHttpRequest(cb)
        })

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)

        callbacks.forEach((cb) => {
            expect(cb).toHaveBeenCalledWith({
                method: 'get',
                url: jsonServerPostsApiEndpoint,
            } as RequestModel)
        })
    })

    it('Should unsubscribe the afterArrives callbacks appropiately', async () => {
        const callback = jest.fn()
        const callback2 = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        const unsubscribe =
            BrowserHttpRequestListener.onHttpResponseArrives(callback2)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        unsubscribe()
        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        expect(callback).toHaveBeenCalledTimes(2)
        expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('Should calls all the subscribed callbacks when response arrives', async () => {
        const callbacks = [
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
            jest.fn(),
        ]

        BrowserHttpRequestListener.start()
        callbacks.forEach((cb) => {
            BrowserHttpRequestListener.onHttpResponseArrives(cb)
        })

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        callbacks.forEach((cb) => {
            expect(cb).toHaveBeenCalled()
        })
    })

    it('Should calls the subscribed callback with the correct args when response arrives', async () => {
        let response = {} as ResponseModel
        let request = {} as RequestModel

        const callback = jest.fn((args: RequestResponseModel) => {
            response = args.response
            request = args.request
        })

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
        await waitFor(100)

        expect(response.responseParsed).toEqual(jsonDb.posts)
        expect(response.statusCode).toBe(200)
        expect(response.statusText).toBe('OK')
        expect(request.method).toBe('get')
        expect(request.url).toBe(jsonServerPostsApiEndpoint)
    })

    it('Should parse the response appropiately for any kind of data', async () => {
        let response = {} as ResponseModel

        const callback = jest.fn((args: RequestResponseModel) => {
            response = args.response
        })

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await doPromiseBasedXHRCall('get', jsonServerStringResponseApiEndpoint)
        await waitFor(100)

        expect(response.responseParsed).toEqual(jsonDb.string)
        response = {} as ResponseModel

        await doPromiseBasedXHRCall('get', jsonServerNullResponseApiEndpoint)
        await waitFor(100)

        expect(response.responseParsed).toEqual('')
        response = {} as ResponseModel

        await doPromiseBasedXHRCall('get', jsonServerNumberResponseApiEndpoint)
        await waitFor(100)

        expect(response.responseParsed).toEqual(jsonDb.number)
    }, 10000)

    it('Should calls the subscribed callback one time for each request', async () => {
        const beforeCallback = jest.fn()
        const afterCallback = jest.fn()

        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(beforeCallback)
        BrowserHttpRequestListener.onHttpResponseArrives(afterCallback)

        const times = 12
        await Promise.all(
            new Array(times)
                .fill('')
                .map(() =>
                    doPromiseBasedXHRCall('get', jsonServerPostsApiEndpoint)
                )
        )

        expect(beforeCallback).toHaveBeenCalledTimes(times)
        expect(afterCallback).toHaveBeenCalledTimes(times)
    })
})
