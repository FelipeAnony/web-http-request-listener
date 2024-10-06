export const isFetchResponse = (response: object): response is Response => {
    return response instanceof Response
}
