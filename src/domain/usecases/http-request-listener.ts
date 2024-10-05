import { RequestModel, RequestResponseModel } from '../models'
import { Unsubscriber, SubscriberCallback } from '../protocols'

export interface HttpRequestListener {
    start(): void
    stop(): void
    beforeSendHttpRequest(
        callback: SubscriberCallback<RequestModel>
    ): Unsubscriber
    onHttpResponseArrives(
        callback: SubscriberCallback<RequestResponseModel>
    ): Unsubscriber
}
