import { BrowserHttpRequestListener } from '@/browser-http-request-listener'

// tests to ensure the library API will not break between versions
describe('BrowserHttpRequestListener', () => {
    it('Should have a start method', () => {
        expect(BrowserHttpRequestListener.start).toBeTruthy()
    })

    it('Should have a stop method', () => {
        expect(BrowserHttpRequestListener.stop).toBeTruthy()
    })

    it('Should return true when the stop method successfully halts the request listener and restores default behavior', () => {
        expect(BrowserHttpRequestListener.stop()).toBe(true)
    })

    it('Should return false when the stop method fails to halt the request listener due to active blockers', () => {
        const unblock = BrowserHttpRequestListener.blockListeningState()
        expect(BrowserHttpRequestListener.stop()).toBe(false)

        // cleanup
        unblock()
    })

    it('Should have a beforeSendHttpRequest method to subscribe callbacks', () => {
        expect(BrowserHttpRequestListener.beforeSendHttpRequest).toBeTruthy()
    })

    it('Should returns the unsubscriber function when beforeSendHttpRequest method is called', () => {
        expect(
            typeof BrowserHttpRequestListener.beforeSendHttpRequest(() => {})
        ).toBe('function')
    })

    it('Should have a onHttpResponseArrives method to subscribe callbacks', () => {
        expect(BrowserHttpRequestListener.onHttpResponseArrives).toBeTruthy()
    })

    it('Should returns the unsubscriber function when onHttpResponseArrives method is called', () => {
        expect(
            typeof BrowserHttpRequestListener.onHttpResponseArrives(() => {})
        ).toBe('function')
    })

    it('Should have a blockListeningState method to avoid stop listening', () => {
        expect(BrowserHttpRequestListener.blockListeningState).toBeTruthy()
    })

    it('Should returns the unblocker function when blockListeningState method is called', () => {
        const unblocker = BrowserHttpRequestListener.blockListeningState()
        expect(typeof unblocker).toBe('function')

        // cleanup
        unblocker()
    })

    it('Should have a clearSubscribers method to clean all the subscribers at once', () => {
        expect(BrowserHttpRequestListener.clearSubscribers).toBeTruthy()
    })

    it('Should return true when the clearSubscribers method successfully cleans the request listeners', () => {
        expect(BrowserHttpRequestListener.clearSubscribers()).toBe(true)
    })

    it('Should return false when the clearSubscribers method fails to cleans the request listeners due to active blockers', () => {
        const unblock = BrowserHttpRequestListener.blockListeningState()
        expect(BrowserHttpRequestListener.clearSubscribers()).toBe(false)

        // cleanup
        unblock()
    })
})
