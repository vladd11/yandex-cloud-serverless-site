const cors: { [key: string]: string } = {
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Headers": "*"
}

if (process.env.DEBUG) {
    cors["Access-Control-Allow-Origin"] = "http://localhost:8000"
} else if(process.env.HOST) {
    cors["Access-Control-Allow-Origin"] = process.env.HOST;
}

export default cors