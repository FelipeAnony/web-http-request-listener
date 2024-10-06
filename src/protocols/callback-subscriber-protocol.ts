export type Unsubscriber = () => void
export type Unblocker = () => void
export type SubscriberCallback<T, U = void> = (params: T) => U
