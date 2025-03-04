import {
    ObjectId,
    DeviceId,
    SharedCyfsStack,
    UtilGetDeviceStaticInfoResponse,
    UtilGetDeviceResponse,
    DecApp,
    SharedCyfsStackParam,
    JSBI
} from 'cyfs-sdk';

// Simulator debugging
// export let stack: SharedCyfsStack;
// // you can get from code-dao-service console,such as `get cyfs-git dec app id: 9tGpLNnSSRzEN5gRmdB77yTtmdsFMqzs3U9z2QWEuDDK`
// const appID = ObjectId.from_base_58('9tGpLNnSSRzEN5gRmdB77yTtmdsFMqzs3U9z2QWEuDDK').unwrap();
// export async function initSimulatorStack() {
//     const service_http_port = 21000;
//     // ws-port of emulator zone1-ood1
//     const ws_port = 21001;
//     // Parameters are required to open the Simulator SharedCyfsStack
//     const param = SharedCyfsStackParam.new_with_ws_event_ports(service_http_port, ws_port, appID);
//     if (param.err) {
//         console.error(`init SharedCyfsStackParam failed, ${param}`);
//         return;
//     }
//     // Open SharedCyfsStack
//     stack = SharedCyfsStack.open(param.unwrap());
//     // Waiting for Stack to go online
//     while (true) {
//         const r = await stack.wait_online(JSBI.BigInt(1000000));
//         if (r.err) {
//             console.error(`wait online err: ${r.val}`);
//         } else {
//             console.info('online success.');
//             break;
//         }
//     }
// }

interface CONFIG_MAP {
    [key: string]: string;
}
const [appID] = (function () {
    const DEPLOY_OWNER_ID_MAP: CONFIG_MAP = {
        dev: '5r4MYfFQz9iEzjwHUpc79CwrvXqsh7xUzynkiTUEckxB',
        beta: '5r4MYfFPKMeHa1fec7dHKmBfowySBfVFvRQvKB956dnF'
    };
    const DEC_APP_NAME = 'CodeDAO';
    // eslint-disable-next-line
    const env = process.env.ENV_TYPE ? process.env.ENV_TYPE : 'dev';
    const owner_id = ObjectId.from_str(DEPLOY_OWNER_ID_MAP[env]).unwrap();
    const dev_id = DecApp.generate_id(owner_id, DEC_APP_NAME);
    console.log(`[${env}] device info: dec_id: ${dev_id}; deployer: ${owner_id}}`);
    return [dev_id];
})();

export const stack = (function () {
    console.log('www open_runtime');
    return SharedCyfsStack.open_runtime(appID);
})();

class StackInfo {
    // @var current runtime device id
    device_id: DeviceId;
    owner: ObjectId;
    ood_device_id: DeviceId;
    cyfs_root = '';

    // @var dec app id (cyfs git)
    appID: ObjectId;

    is_ood_device = false;
    is_init = false;
    constructor() {
        // to tmp
        this.device_id = new DeviceId(appID);
        this.owner = appID;
        this.ood_device_id = new DeviceId(appID);
        this.appID = appID;
    }

    async init() {
        // const [device_id, device] = (await stack.util().get_current_device()).unwrap()
        const [device, device_static_info] = await Promise.all([
            stack.util().get_device({
                common: {
                    dec_id: this.appID,
                    flags: 0
                }
            }),
            stack.util().get_device_static_info({
                common: {
                    dec_id: this.appID,
                    flags: 0
                }
            })
        ]);
        const deviceResp = device.unwrap() as UtilGetDeviceResponse;
        const staticInfo = device_static_info.unwrap() as UtilGetDeviceStaticInfoResponse;

        // ;(console as any).origin.log('init', JSON.stringify(deviceResp), JSON.stringify(staticInfo))

        this.device_id = deviceResp.device_id;
        this.owner = deviceResp.device.desc().owner()!;

        this.ood_device_id = staticInfo.info.ood_device_id;
        this.cyfs_root = staticInfo.info.cyfs_root;
        this.is_ood_device = staticInfo.info.is_ood_device;
        this.is_init = true;
    }

    async getTargetDevice(object_id: ObjectId, owner_id: ObjectId): Promise<DeviceId[]> {
        const resp = await stack.util().resolve_ood({
            common: {
                dec_id: this.appID,
                flags: 0
            },
            object_id: object_id,
            owner_id: owner_id
        });

        return resp.unwrap().device_list;
    }

    // 这里只要第一个 ood device就可以了
    async getTargetDeviceFromString(object_id: string, owner_id: string): Promise<ObjectId> {
        const theOwner: ObjectId = ObjectId.from_base_58(owner_id).unwrap();
        const theObject: ObjectId = ObjectId.from_base_58(object_id).unwrap();

        const device = await this.getTargetDevice(theOwner, theObject);
        return device[0].object_id;
    }

    checkOwner(owner_id: string): boolean {
        const targetOwner: ObjectId = ObjectId.from_base_58(owner_id).unwrap();
        return targetOwner.eq(this.owner);
    }
}

export const stackInfo = new StackInfo();
