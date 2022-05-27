export default interface Product {
    id: String,
    count: number
}

export interface OrderItem extends Product {
    orderItemID?: Buffer
}