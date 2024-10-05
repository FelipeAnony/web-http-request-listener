export type Unsubscriber = () => void
export type SubscriberCallback<T, U = void> = (params: T) => U
