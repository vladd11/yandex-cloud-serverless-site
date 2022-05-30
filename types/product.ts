export default interface Product {
    id: string,
    count: number
}

export interface OrderItem extends Product {
    value: Buffer
    orderItemID?: Buffer
}