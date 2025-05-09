export interface RpcMessage {
    type: "invoke";
    method: string;
    args: any;
}  