export type Method = (body: string) => void | Promise<void>;

type Methods = { [key: string]: Method };
export default Methods;
