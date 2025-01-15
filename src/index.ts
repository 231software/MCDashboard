import {Logger,InitEvent, TickEvent, Player, setMotd} from "../lib/index.js";
import {Worker, isMainThread, parentPort, workerData,MessageChannel} from 'worker_threads';
import { animationConfFromFile, conf, motdConf } from "./conf.js";
import { AnimatedTextConfig } from "./lib/display.js";
class MotdLoop{
    private content:AnimatedTextConfig[]
    private frame:number=0
    private loop:NodeJS.Timeout
    //开启渲染服务
    private static motdRenderService = new Worker(__filename.replace("index.js","textRenderer.js"), {workerData: {}});
    //初始化渲染服务使用的消息通道
    private static serviceChannels=new MessageChannel()
    constructor(){
        //现在只做好了be和通用的动画，java的motd很特殊，需要单独做一种动画
        const BEcontentConfigFile:any[]=motdConf.get("bedrock").contents
        const BEcontentConf:AnimatedTextConfig[]=(()=>{
            const result:AnimatedTextConfig[]=[]
            for(let partConf of BEcontentConfigFile){
                result.push(animationConfFromFile(partConf))
            }
            return result
        })()
        this.content=BEcontentConf
        this.loop=setInterval(()=>this.update(),motdConf.get("bedrock").freq*1000) 
        MotdLoop.motdRenderService.postMessage({ port: MotdLoop.serviceChannels.port2 }, [MotdLoop.serviceChannels.port2]) 
        // 监听来自渲染服务的消息 
        MotdLoop.serviceChannels.port1.on('message', (msg) => { 
            //Logge r.info("Received message from worker:", msg); 
            // 可以在这里处理从子进程接收的消息 
            //msg.target.platform为java版
            switch(msg.target?.position){
                case "motd":{
                    //Logger.info(msg.result)
                    setMotd(msg.result)
                    break;
                }
                case "console":textRenderLogger(msg);break;
            }
        });
    }
    update(){
        MotdLoop.motdRenderService.postMessage({
            cmdType:"render",
            conf:this.content,
            frame:this.frame,
            vars:{},
            target:{
                position:"motd"
            }
        })
        this.frame++
    }
    destroy(){
        clearInterval(this.loop)
    }
}
//开启motd循环，命令重载配置文件会使该循环重启
let motdLoop=new MotdLoop()
//单个玩家的侧边栏渲染循环任务
class PlayerSidebarLoop{
    fps:number
    contents:AnimatedTextConfig[][]
    player:Player
    constructor(){
        
    }
}
TickEvent.on(e=>{
    //开启侧边栏循环
    //玩家修改侧边栏的动作会使该循环重启
    //每tick步进一次进行渲染
    //为当前所有玩家所需的侧边栏整理出一个列表
    //每tick所有玩家所需的变量的并集将被提前整理出来，放进一个单独的集合里
    //监听到tick时，判断当前tick是否有侧边栏需要渲染，如果需要就调用渲染服务，将这个tick所需的全部侧边栏渲染出来
})
function textRenderLogger(data:{level:string,msg:string[]}){
    switch(data.level){
        case "info":Logger.info(...data.msg);break;
        case "error":Logger.error(...data.msg);break;
    }
}