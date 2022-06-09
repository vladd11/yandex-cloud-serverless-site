import {ApiResponse} from "./response";

export type Method = (body: string) => ApiResponse | Promise<ApiResponse>;

type Methods = { [key: string]: Method };
export default Methods;
