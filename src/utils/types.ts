export type PartialRequired<T, K extends keyof T> = Required<{
    [P in K]: T[P];
}>

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
