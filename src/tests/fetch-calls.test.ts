import { BrowserHttpRequestListener } from '@/browser-http-request-listener'
import { RequestModel, RequestResponseModel, ResponseModel } from '@/models'
import jsonDb from './db.json'
import { waitFor } from './utils'

const jsonServerApiEndpoint = 'http://localhost:3000/posts'

describe('browser-http-request-listener', () => {
    afterAll(() => {
        BrowserHttpRequestListener.stop()
    })

    it('Should not listen for calls untill start method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()

        BrowserHttpRequestListener.start()
        await fetch(jsonServerApiEndpoint)
        await waitFor(10)

        expect(callback).toHaveBeenCalledTimes(2)
    })

    it('Should stop listen for calls appropiately when the stop method is called', async () => {
        const callback = jest.fn()
        BrowserHttpRequestListener.beforeSendHttpRequest(callback)
        BrowserHttpRequestListener.onHttpResponseArrives(callback)
        BrowserHttpRequestListener.start()

        await fetch(jsonServerApiEndpoint)
        await waitFor(10)
        expect(callback).toHaveBeenCalled()

        callback.mockClear()
        BrowserHttpRequestListener.stop()

        await fetch(jsonServerApiEndpoint)
        expect(callback).not.toHaveBeenCalled()
    })

    it('Should calls all the subscribed callbacks before the actual fetch calls', async () => {
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

        await fetch(jsonServerApiEndpoint, {
            method: 'get',
            headers: {
                Authorization: 'any-auth',
            },
        })

        callbacks.forEach((cb) => {
            expect(cb).toHaveBeenCalledWith({
                method: 'get',
                url: jsonServerApiEndpoint,
                body: undefined,
                headers: {
                    Authorization: 'any-auth',
                },
            } as RequestModel)
        })
    })

    it('Should modifiy the original request appropiately when beforeSend callback returns a new request object', async () => {
        BrowserHttpRequestListener.start()
        BrowserHttpRequestListener.beforeSendHttpRequest(() => {
            return {
                url: jsonServerApiEndpoint,
            }
        })

        const res = await fetch('any-url')
        expect(res.url).toBe(jsonServerApiEndpoint)
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

        await fetch(jsonServerApiEndpoint)
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

        await fetch(jsonServerApiEndpoint, {
            method: 'get',
            headers: {
                Authorization: 'any-auth',
            },
        })
        await waitFor(10)

        expect(response.responseParsed).toEqual(jsonDb.posts)
        expect(response.statusCode).toBe(200)
        expect(response.statusText).toBe('OK')
        expect(request.method).toBe('get')
        expect(request.headers).toEqual({
            Authorization: 'any-auth',
        })
        expect(request.url).toBe(jsonServerApiEndpoint)
    })
})
