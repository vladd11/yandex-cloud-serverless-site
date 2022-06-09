type Method = () => void;
type Methods = {
    [key: string]: () => void | Methods
}

export interface RoutingTable {
    index: () => void,

    [key: string]: Method | Methods
}

export default function route(path: string, rules: RoutingTable) {
    if (path === "" || path === "/") {
        return rules.index
    }

    Object.keys(rules).find(value => {
        //if()
    })
    path.split("/")
}
