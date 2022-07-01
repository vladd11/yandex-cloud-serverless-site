const paymentMethods: PaymentMethod = {
    cash: 1,
    card: 2
}

export type PaymentMethod = { [key: string]: number };

export function getPaymentMethodByNumberID(id: number): string | undefined {
    return Object.keys(paymentMethods).find(key => paymentMethods[key] === id);
}

export default paymentMethods;
