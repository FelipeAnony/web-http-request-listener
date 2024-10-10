export const waitFor = (timeInMs: number) => {
    return new Promise((res) => {
        setTimeout(res, timeInMs)
    })
}
