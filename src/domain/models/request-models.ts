export interface RequestModel {
    url: string
    method: string
    body?: unknown
}

export interface ResponseModel {
    data: unknown
    statusCode: number
    statusText: string
}

export interface RequestResponseModel {
    request: RequestModel
    response: ResponseModel
}
