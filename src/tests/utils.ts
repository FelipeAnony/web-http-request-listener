export const waitFor = (timeMs: number) => {
    return new Promise((res) => {
        setTimeout(res, timeMs)
    })
}
