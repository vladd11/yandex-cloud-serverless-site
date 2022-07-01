export default interface Product {
    id: string,
    count: number
}

export interface OrderItem extends Product {
    orderItemID?: Buffer
}