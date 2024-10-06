/* eslint-disable @typescript-eslint/no-explicit-any */
export type GetFnParams<T extends (...args: any) => any> = T extends (
    ...args: infer U
) => any
    ? U
    : never
