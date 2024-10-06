export interface RequestModel {
    url: string
    method: string
    body?: BodyInit | null
    headers?: HeadersInit
    xhrInstance?: typeof XMLHttpRequest.prototype
}

export interface ResponseModel {
    rawResponse: Response
    responseParsed?: unknown
    statusCode: number
    statusText: string
}

export interface RequestResponseModel {
    request: RequestModel
    response: ResponseModel
}

export interface XHRResponseModel {
    response: XMLHttpRequest['response']
    statusCode: number
    statusText: string
}
